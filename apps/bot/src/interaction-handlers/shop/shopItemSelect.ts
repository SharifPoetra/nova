import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getItemById, type ShopCategory } from '../../lib/shop/categories';
import { COLORS, formatNumber } from '../../lib/utils';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

@ApplyOptions({
  name: 'shopItemSelect',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class ShopItemSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.isStringSelectMenu() && interaction.customId.startsWith('shop_item_')
      ? this.some()
      : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const customIdParts = interaction.customId.split('_');
    const userId = customIdParts[2];
    const category = customIdParts[3] as ShopCategory;
    const pageStr = customIdParts[4] || '0';

    // User validation
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: t('commands/shop:not_yours', { defaultValue: 'This is not your shop 😅' }),
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    try {
      const itemId = interaction.values[0];
      const item = getItemById(category, itemId);

      if (!item) {
        return interaction.editReply({
          content: t('commands/shop:item_not_found', { defaultValue: '❌ Item not found.' }),
          embeds: [],
          components: [],
        });
      }

      const user = await this.container.db.user.findOne({ discordId: userId });
      if (!user) {
        return interaction.editReply({
          content: t('common:need_start', { defaultValue: '❌ You need to start first. Use `/start`.' }),
          embeds: [],
          components: [],
        });
      }

      applyPassiveRegen(user);
      await user.save();

      // ROUTING: Potions vs Backgrounds
      if (category === 'potions') {
        return this.handlePotionSelection(interaction, userId, category, item, user, pageStr, t);
      }

      if (category === 'backgrounds') {
        return this.handleBackgroundSelection(interaction, userId, category, item, user, pageStr, t);
      }
    } catch (error) {
      this.container.logger.error(error);
      await interaction
        .editReply({
          content: t('commands/shop:error', { defaultValue: '❌ An error occurred.' }),
          embeds: [],
          components: [],
        })
        .catch(() => {});
    }
  }

  private async handlePotionSelection(
    interaction: StringSelectMenuInteraction,
    userId: string,
    category: ShopCategory,
    item: any,
    user: any,
    pageStr: string,
    t: any,
  ) {
    // Show confirmation embed untuk potion
    const embed = new EmbedBuilder()
      .setColor(COLORS.warning)
      .setTitle(t('commands/shop:confirm_title', { defaultValue: '📦 Purchase Confirmation' }))
      .setDescription(
        `${item.emoji} **${item.name}**\n\n` +
          `${item.description}\n\n` +
          `**Price:** ${formatNumber(item.price)} 💰\n` +
          `**Your balance:** ${formatNumber(user.balance)} 💰`,
      );

    if (user.balance < item.price) {
      embed.setColor(COLORS.error);
      embed.addFields({
        name: '❌ Insufficient Balance',
        value: `Need ${formatNumber(item.price - user.balance)} more coins`,
      });
    }

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`shop_confirm_${userId}_${category}_${item.id}_${pageStr}`)
        .setLabel(t('commands/shop:buy', { defaultValue: 'Buy' }))
        .setStyle(ButtonStyle.Success)
        .setDisabled(user.balance < item.price),
      new ButtonBuilder()
        .setCustomId(`shop_cat_${userId}_${category}_${pageStr}`)
        .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
        .setStyle(ButtonStyle.Secondary),
    ];

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  }

  private async handleBackgroundSelection(
    interaction: StringSelectMenuInteraction,
    userId: string,
    category: ShopCategory,
    item: any,
    user: any,
    pageStr: string,
    t: any,
  ) {
    // Check if user already owns this background
    const bgId = item.id.replace('bg_', '');
    const ownedBg = await this.container.db.userBackground?.findOne({
      discordId: userId,
      backgroundId: bgId,
    });

    if (ownedBg) {
      // Already owned - show "Set Active" button
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(t('commands/shop:already_owned_title', { defaultValue: '✨ Already Owned' }))
        .setDescription(
          `${item.emoji} **${item.name}**\n\n` + `${item.description}\n\n` + `You already own this background!`,
        );

      if (ownedBg.isActive) {
        embed.addFields({
          name: '🎯 Status',
          value: t('commands/shop:currently_active', { defaultValue: 'Currently active' }),
        });
      }

      const buttons = [
        new ButtonBuilder()
          .setCustomId(`shop_set_active_${userId}_${bgId}_${pageStr}`)
          .setLabel(t('commands/shop:set_active', { defaultValue: 'Set as Active' }))
          .setStyle(ownedBg.isActive ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(ownedBg.isActive),
        new ButtonBuilder()
          .setCustomId(`shop_cat_${userId}_${category}_${pageStr}`)
          .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
          .setStyle(ButtonStyle.Secondary),
      ];

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      return interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    }

    // Not owned - show preview button
    const embed = new EmbedBuilder()
      .setColor(item.rarityColor || COLORS.primary)
      .setTitle(
        t('commands/shop:preview_title', {
          emoji: item.emoji,
          name: item.name,
          defaultValue: `${item.emoji} ${item.name}`,
        }),
      )
      .setDescription(
        `${item.description}\n\n` +
          `**Rarity:** ${item.rarity}\n` +
          `**Price:** ${formatNumber(item.price)} 💰\n` +
          `**Your balance:** ${formatNumber(user.balance)} 💰`,
      );

    if (user.balance < item.price) {
      embed.setColor(COLORS.error);
      embed.addFields({
        name: '❌ Insufficient Balance',
        value: `Need ${formatNumber(item.price - user.balance)} more coins`,
      });
    }

    const buttons = [
      new ButtonBuilder()
        .setCustomId(`shop_preview_${userId}_${bgId}_${pageStr}`)
        .setLabel(t('commands/shop:preview', { defaultValue: 'Preview' }))
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`shop_confirm_${userId}_${category}_${item.id}_${pageStr}`)
        .setLabel(t('commands/shop:buy', { defaultValue: 'Buy' }))
        .setStyle(ButtonStyle.Success)
        .setDisabled(user.balance < item.price),
      new ButtonBuilder()
        .setCustomId(`shop_cat_${userId}_${category}_${pageStr}`)
        .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
        .setStyle(ButtonStyle.Secondary),
    ];

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  }
}
