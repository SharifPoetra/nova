import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js';
import { RARITY_COLOR } from '../lib/utils';
import { applyPassiveRegen } from '../lib/rpg/buffs';

const ITEMS_PER_PAGE = 10;
const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

@ApplyOptions({ name: 'inv', interactionHandlerType: InteractionHandlerTypes.MessageComponent })
export class InvUseHandler extends InteractionHandler {
  public override parse(interaction) {
    if (typeof interaction.customId !== 'string') return this.none();
    if (
      interaction.customId.startsWith('inv_prev_') ||
      interaction.customId.startsWith('inv_next_') ||
      interaction.customId.startsWith('inv_use_')
    ) {
      return this.some();
    }
    return this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const userId = interaction.customId.split('_').at(-1)!;
    if (interaction.user.id !== userId)
      return interaction.reply({ content: 'Bukan inventory kamu!', flags: MessageFlags.Ephemeral });

    if (interaction.isStringSelectMenu()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    } else {
      await interaction.deferUpdate();
    }

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_use_')) {
      const itemId = interaction.values[0];
      const item = await this.container.db.item.findOne({ itemId }).lean();
      if (!item) return interaction.followUp({ content: 'Item tidak ditemukan' });

      const invItem = user.items.find((i) => i.itemId === itemId);
      if (!invItem || invItem.qty < 1) return interaction.followUp({ content: 'Habis!' });

      const effects = item.effects || [];
      if (effects.length === 0) {
        return interaction.followUp({
          content: '❌ Item ini tidak bisa dipakai',
        });
      }

      let msg = `✅ Pakai ${item.emoji} **${item.name}**`;
      let applied = 0;

      for (const eff of effects) {
        if (eff.type === 'heal') {
          const before = user.hp ?? 0;
          const maxHp = user.maxHp ?? 100;
          if (before >= maxHp) continue;
          user.hp = Math.min(maxHp, before + eff.value);
          const gained = user.hp - before;
          if (gained > 0) {
            msg += `\n❤️ +${gained} HP`;
            applied++;
          }
        } else if (eff.type === 'stamina') {
          const before = user.stamina ?? 0;
          const maxSt = user.maxStamina ?? 100;
          if (before >= maxSt) continue;
          user.stamina = Math.min(maxSt, before + eff.value);
          const gained = user.stamina - before;
          if (gained > 0) {
            msg += `\n⚡ +${gained} Stamina`;
            applied++;
          }
        } else if (eff.type === 'buff') {
          user.buffs = user.buffs || [];
          user.buffs.push({
            type: 'atk',
            value: eff.value,
            expires: new Date(Date.now() + 10 * 60 * 1000),
          });
          msg += `\n⚔️ ATK +${eff.value} (10m)`;
          applied++;
        } else if (eff.type === 'mana') {
          msg += `\n🔮 Mana +${eff.value} (belum aktif)`;
        }
      }

      if (applied === 0) {
        return interaction.followUp({
          content: `❌ ${item.emoji} **${item.name}** tidak berpengaruh (HP/Stamina sudah penuh)`,
        });
      }

      invItem.qty -= 1;
      if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
      await user.save();
      return interaction.followUp({ content: msg });
    }

    if (interaction.isButton()) {
      const [, dir, pageStr] = interaction.customId.split('_');
      let page = Number.parseInt(pageStr, 10);
      page = dir === 'next' ? page + 1 : page - 1;
      const cache = this.container.invCache!.get(interaction.message.id)!;
      const { allItems, totalValue } = cache;
      const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
      page = Math.max(0, Math.min(page, totalPages - 1));
      const pageItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
      const topRarity = pageItems[0]?.rarity || 'Common';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.username}'s Inventory`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
        .setDescription(
          `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n📦 ${allItems.length} jenis item`,
        )
        .setFooter({
          text: `Total nilai: ${totalValue.toLocaleString('id-ID')} koin | Hal ${page + 1}/${totalPages}`,
        });

      for (const it of pageItems) embed.addFields({ name: it.text, value: it.sub });
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`inv_prev_${page}_${userId}`)
          .setLabel('◀ Sebelumnya')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(`inv_next_${page}_${userId}`)
          .setLabel('Selanjutnya ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      );

      const itemIds = user.items.map((i) => i.itemId);
      const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } }).lean();
      const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));
      const consumables = user.items
        .filter((i) => itemMap.get(i.itemId)?.type === 'consumable')
        .slice(0, 25);
      const components: (
        | ActionRowBuilder<ButtonBuilder>
        | ActionRowBuilder<StringSelectMenuBuilder>
      )[] = [row];

      if (consumables.length) {
        components.push(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`inv_use_${userId}`)
              .setPlaceholder('Gunakan consumable...')
              .addOptions(
                consumables.map((c) => {
                  const d = itemMap.get(c.itemId)!;
                  return {
                    label: `${d.name} x${c.qty}`,
                    value: c.itemId,
                    description: d.description?.slice(0, 50) || '',
                    emoji: sanitizeEmoji(d.emoji),
                  };
                }),
              ),
          ),
        );
      }
      await interaction.editReply({ embeds: [embed], components });
    }
  }
}
