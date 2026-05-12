import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { RARITY_COLOR } from '../lib/utils';

const ITEMS_PER_PAGE = 10;
const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

@ApplyOptions<InteractionHandler.Options>({
  name: 'inv',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
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
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'Bukan inventory kamu!', ephemeral: true });
    }

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_use_')) {
      const itemId = interaction.values[0];
      const item = await this.container.db.item.findOne({ itemId }).lean();
      if (!item) return interaction.reply({ content: 'Item tidak ditemukan', ephemeral: true });

      const invItem = user.items.find((i) => i.itemId === itemId);
      if (!invItem || invItem.qty < 1)
        return interaction.reply({ content: 'Habis!', ephemeral: true });

      let msg = `✅ Pakai ${item.emoji} **${item.name}**`;
      if (item.effect === 'heal') {
        const before = user.hp ?? 0;
        user.hp = Math.min(user.maxHp ?? 100, before + (item.effectValue || 0));
        msg += ` (+${user.hp - before} HP)`;
        if (item.itemId === 'nova_essence') {
          const beforeS = user.stamina ?? 0;
          user.stamina = Math.min(user.maxStamina ?? 100, beforeS + 50);
          msg += ` (+50 ⚡)`;
        }
      } else if (item.effect === 'stamina') {
        const before = user.stamina ?? 0;
        user.stamina = Math.min(user.maxStamina ?? 100, before + (item.effectValue || 0));
        msg += ` (+${user.stamina - before} ⚡)`;
      }

      invItem.qty -= 1;
      if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
      await user.save();
      await interaction.update({ content: msg, components: [] });
      return;
    }

    if (interaction.isButton()) {
      const [, dir, pageStr] = interaction.customId.split('_');
      let page = Number.parseInt(pageStr, 10);
      page = dir === 'next' ? page + 1 : page - 1;

      const cache = this.container.invCache?.get(interaction.message.id);
      if (!cache)
        return interaction.update({
          content: 'Cache expired, ketik /inventory lagi',
          components: [],
        });

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
          .setLabel('◀')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(`inv_next_${page}_${userId}`)
          .setLabel('▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      );

      const itemIds = user.items.map((i) => i.itemId);
      const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } }).lean();
      const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));
      const consumables = user.items
        .filter((i) => itemMap.get(i.itemId)?.type === 'consumable')
        .slice(0, 25);

      const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [row];
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

      await interaction.update({ embeds: [embed], components });
    }
  }
}
