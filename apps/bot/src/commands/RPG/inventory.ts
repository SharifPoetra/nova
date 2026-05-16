import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR } from '../../lib/utils';

const RARITY_ORDER = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;
const ITEMS_PER_PAGE = 10;

type GroupedItem = { id: string; text: string; sub: string; value: number; rarity: string };

const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

@ApplyOptions<Command.Options>({
  name: 'inventory',
  description: 'View all your items',
  fullCategory: ['RPG'],
})
export class InventoryCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:inventory', 'commands/descriptions:inventory'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user)
      return interaction.editReply(
        t('common:need_start', { defaultValue: '❌ Use /start first!' }),
      );

    applyPassiveRegen(user);
    await user.save();

    if (!user.items?.length) {
      return interaction.editReply(
        t('commands/inventory:empty', {
          defaultValue: '📦 Inventory empty. Try /fish or /explore!',
        }),
      );
    }

    const itemIds = user.items.map((i) => i.itemId);
    const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } }).lean();
    const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));

    let totalValue = 0;
    const allItems: GroupedItem[] = [];

    for (const inv of user.items) {
      const data = itemMap.get(inv.itemId);
      if (!data) continue;
      const value = (data.sellPrice ?? 0) * inv.qty;
      totalValue += value;
      allItems.push({
        id: inv.itemId,
        text: `${data.emoji} **${data.name}** x${inv.qty}`,
        sub: `> ${value.toLocaleString(interaction.locale)} 💰 • ${data.description || '-'}`,
        value,
        rarity: data.rarity || 'Common',
      });
    }

    allItems.sort((a, b) => {
      const ra = RARITY_ORDER.indexOf(a.rarity as any);
      const rb = RARITY_ORDER.indexOf(b.rarity as any);
      return ra !== rb ? ra - rb : b.value - a.value;
    });

    const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
    const page = 0;
    const pageItems = allItems.slice(0, ITEMS_PER_PAGE);
    const topRarity = pageItems[0]?.rarity || 'Common';

    const embed = new EmbedBuilder()
      .setAuthor({
        name: t('commands/inventory:author', {
          username: interaction.user.username,
          defaultValue: `${interaction.user.username}'s Inventory`,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
      .setDescription(
        t('commands/inventory:header', {
          stamina: user.stamina,
          maxStamina: user.maxStamina,
          count: allItems.length,
          defaultValue: `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n📦 ${allItems.length} item types`,
        }),
      )
      .setFooter({
        text: t('commands/inventory:footer', {
          total: totalValue.toLocaleString(interaction.locale),
          page: page + 1,
          totalPages,
          defaultValue: `Total value: ${totalValue.toLocaleString()} coins | Page ${page + 1}/${totalPages}`,
        }),
      });

    for (const it of pageItems) embed.addFields({ name: it.text, value: it.sub });

    const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];
    if (totalPages > 1) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_prev_${page}_${interaction.user.id}`)
            .setLabel(t('commands/inventory:prev', { defaultValue: '◀ Previous' }))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`inv_next_${page}_${interaction.user.id}`)
            .setLabel(t('commands/inventory:next', { defaultValue: 'Next ▶' }))
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(totalPages <= 1),
        ),
      );
    }

    const consumables = user.items
      .filter((i) => itemMap.get(i.itemId)?.type === 'consumable')
      .slice(0, 25);

    if (consumables.length) {
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inv_use_${interaction.user.id}`)
            .setPlaceholder(
              t('commands/inventory:use_placeholder', { defaultValue: 'Use consumable...' }),
            )
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

    const msg = await interaction.editReply({ embeds: [embed], components });

    this.container.invCache ??= new Map();
    this.container.invCache.set(msg.id, {
      allItems,
      totalValue,
      userId: interaction.user.id,
      t: Date.now(),
      locale: interaction.locale,
    });

    setTimeout(
      async () => {
        try {
          const expiredEmbed = EmbedBuilder.from(embed)
            .setFooter({
              text: t('commands/inventory:expired', {
                defaultValue: '⏰ Expired — type /inventory again',
              }),
            })
            .setColor(0x808080);

          await interaction.editReply({ embeds: [expiredEmbed], components: [] });
          this.container.invCache.delete(msg.id);
        } catch {
          /* ignore */
        }
      },
      5 * 60 * 1000,
    );
  }
}
