import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { SHOP_CATEGORIES, getShopItems, type ShopCategory } from '../../lib/shop/categories';
import { RARITY_COLOR, COLORS, formatNumber } from '../../lib/utils';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

const ITEMS_PER_PAGE = 25;

@ApplyOptions({
  name: 'shopCategorySelect',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class ShopCategorySelectHandler extends InteractionHandler {
  public override parse(interaction) {
    const isShopCategory = interaction.isStringSelectMenu() && interaction.customId.startsWith('shop_cat_');
    const isShopBack = interaction.isButton() && interaction.customId.startsWith('shop_back_');
    const isShopPrev = interaction.isButton() && interaction.customId.startsWith('shop_prev_');
    const isShopNext = interaction.isButton() && interaction.customId.startsWith('shop_next_');
    return isShopCategory || isShopBack || isShopPrev || isShopNext ? this.some() : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const t = await fetchT(interaction);
    const customIdParts = interaction.customId.split('_');
    const userId = customIdParts[2];
    const category = customIdParts[3] as ShopCategory;
    const pageStr = customIdParts[4] || '0';
    const page = parseInt(pageStr, 10) || 0;

    // User validation
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: t('commands/shop:not_yours', { defaultValue: 'This is not your shop 😅' }),
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    try {
      const user = await this.container.db.user.findOne({ discordId: userId });
      if (!user) {
        return interaction.editReply({
          content: t('common:need_start', { defaultValue: '❌ You need to start first. Use `/start`.' }),
          embeds: [],
          components: [],
        });
      }

      // Apply passive regen
      applyPassiveRegen(user);
      await user.save();

      // Get items dari kategori
      let items = getShopItems(category);

      // Filter backgrounds: hanya show yang belum dimiliki
      if (category === 'backgrounds') {
        const ownedBackgrounds = await this.container.db.userBackground
          ?.find({ discordId: userId })
          .select('backgroundId')
          .lean();

        const ownedIds = new Set(ownedBackgrounds?.map((bg) => bg.backgroundId) || []);
        items = items.filter((item) => {
          // Extract background id dari item.id (format: bg_{id})
          const bgId = item.id.replace('bg_', '');
          return !ownedIds.has(bgId);
        });
      }

      if (!items.length) {
        return interaction.editReply({
          content:
            category === 'backgrounds'
              ? t('commands/shop:all_backgrounds_owned', {
                  defaultValue: '🎉 You own all available backgrounds!',
                })
              : t('commands/shop:no_items', { defaultValue: '❌ No items available in this category.' }),
          embeds: [],
          components: [],
        });
      }

      // PAGINATION
      const isPrevButton = interaction.customId.startsWith('shop_prev_');
      const isNextButton = interaction.customId.startsWith('shop_next_');

      if (isPrevButton || isNextButton) {
        const newPage = isPrevButton ? page - 1 : page + 1;
        const startIndex = newPage * ITEMS_PER_PAGE;
        const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

        return this.renderCategoryPage(interaction, userId, category, user, items, newPage, t);
      }

      // Initial category view
      return this.renderCategoryPage(interaction, userId, category, user, items, page, t);
    } catch (error) {
      this.container.logger.error(error);
      await interaction.editReply({
        content: t('commands/shop:error', { defaultValue: '❌ An error occurred.' }),
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  }

  private async renderCategoryPage(
    interaction: StringSelectMenuInteraction | ButtonInteraction,
    userId: string,
    category: ShopCategory,
    user: any,
    items: any[],
    page: number,
    t: any,
  ) {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const startIndex = page * ITEMS_PER_PAGE;
    const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Render kategori embed
    const categoryInfo = SHOP_CATEGORIES[category];
    const topRarity = pageItems[0]?.rarity || 'Common';
    const embed = new EmbedBuilder()
      .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR] || COLORS.primary)
      .setTitle(`${categoryInfo.emoji} ${categoryInfo.name}`)
      .setDescription(categoryInfo.description);

    // List items untuk halaman ini
    const itemLines = pageItems.map((item) => {
      const priceText = item.price === 0 ? '**FREE**' : `**${formatNumber(item.price)}** 💰`;
      return `${item.emoji} **${item.name}**\n> ${item.description} — ${priceText}`;
    });

    embed.addFields({
      name: t('commands/shop:available', { defaultValue: 'Available Items' }),
      value: itemLines.join('\n') || t('commands/shop:none', { defaultValue: 'None' }),
    });

    // Footer dengan balance dan pagination
    const footerText =
      items.length > ITEMS_PER_PAGE
        ? t('commands/shop:balance_footer_page', {
            balance: formatNumber(user.balance),
            page: page + 1,
            total: totalPages,
            defaultValue: `Your balance: ${formatNumber(user.balance)} coins | Page ${page + 1}/${totalPages}`,
          })
        : t('commands/shop:balance_footer', {
            balance: formatNumber(user.balance),
            defaultValue: `Your balance: ${formatNumber(user.balance)} coins`,
          });

    embed.setFooter({ text: footerText });

    // Generate select menu untuk items (max 25 options)
    const selectOptions = pageItems.map((item) => ({
      label: item.name.slice(0, 100),
      value: item.id,
      description: `${item.description.slice(0, 50)} — ${item.price} coins`,
      emoji: item.emoji,
    }));

    const selectMenu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`shop_item_${userId}_${category}_${page}`)
        .setPlaceholder(
          t('commands/shop:select_placeholder', {
            category: categoryInfo.name.toLowerCase(),
            defaultValue: `Select a ${categoryInfo.name.toLowerCase()}...`,
          }),
        )
        .addOptions(selectOptions),
    );

    const components: ActionRowBuilder<any>[] = [selectMenu];

    // Pagination buttons jika items > 25
    if (items.length > ITEMS_PER_PAGE) {
      const prevButton = new ButtonBuilder()
        .setCustomId(`shop_prev_${userId}_${category}_${page}`)
        .setLabel(t('common:ui.prev', { defaultValue: '◀ Previous' }))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId(`shop_next_${userId}_${category}_${page}`)
        .setLabel(t('common:ui.next', { defaultValue: 'Next ▶' }))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(startIndex + ITEMS_PER_PAGE >= items.length);

      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
    }

    // Action buttons
    const actionButtons: ButtonBuilder[] = [
      new ButtonBuilder()
        .setCustomId(`shop_back_${userId}`)
        .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
        .setStyle(ButtonStyle.Secondary),
    ];

    // "My Backgrounds" button hanya untuk backgrounds category
    if (category === 'backgrounds') {
      actionButtons.unshift(
        new ButtonBuilder()
          .setCustomId(`shop_owned_${userId}_0`)
          .setLabel(t('commands/shop:my_backgrounds', { defaultValue: 'My Backgrounds' }))
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🖼️'),
      );
    }

    components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(actionButtons));

    await interaction.editReply({
      embeds: [embed],
      components,
    });
  }
}
