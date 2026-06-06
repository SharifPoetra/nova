import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { SHOP_CATEGORIES } from './categories';
import { formatNumber } from '../utils';

export function buildShopMain(userId: string, balance: number, t: any) {
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle(t('commands/shop:title', { defaultValue: '🏪 Nova Shop' }))
    .setDescription(
      t('commands/shop:welcome', {
        defaultValue: 'Welcome to the Nova Shop! Select a category below to browse items.',
      }),
    )
    .addFields(
      Object.entries(SHOP_CATEGORIES).map(([, cat]) => ({
        name: `${cat.emoji} ${cat.name}`,
        value: cat.description,
        inline: true,
      })),
    )
    .setFooter({
      text: t('commands/shop:balance_footer', {
        balance: formatNumber(balance),
        defaultValue: `Your balance: ${formatNumber(balance)} coins`,
      }),
    });

  const categorySelect = new StringSelectMenuBuilder()
    .setCustomId(`shop_cat_${userId}_main`)
    .setPlaceholder(t('commands/shop:select_category', { defaultValue: 'Select a category...' }))
    .addOptions(
      Object.entries(SHOP_CATEGORIES).map(([key, cat]) => ({
        label: cat.name,
        value: key,
        description: cat.description.slice(0, 100),
        emoji: cat.emoji,
      })),
    );

  const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(categorySelect);

  const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`shop_close_${userId}`)
      .setLabel(t('common:ui.close'))
      .setStyle(ButtonStyle.Secondary),
  );

  return { embeds: [embed], components: [selectRow, buttons] };
}
