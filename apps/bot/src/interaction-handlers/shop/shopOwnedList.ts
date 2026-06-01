import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, StringSelectMenuInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getAllBackgrounds } from '../../lib/canvas/backgrounds';
import { RARITY_COLOR, COLORS, formatNumber } from '../../lib/utils';
import { UserBackground } from '@nova/db';

const ITEMS_PER_PAGE = 25;

@ApplyOptions({
  name: 'shopOwnedList',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class ShopOwnedListHandler extends InteractionHandler {
  public override parse(interaction) {
    const isOwnedButton = interaction.isButton() && interaction.customId.startsWith('shop_owned_');
    const isSetActive = interaction.isButton() && interaction.customId.startsWith('shop_set_active_');
    const isOwnedSelect = interaction.isStringSelectMenu() && interaction.customId.startsWith('shop_owned_select_');
    const isOwnedPrev = interaction.isButton() && interaction.customId.startsWith('shop_owned_prev_');
    const isOwnedNext = interaction.isButton() && interaction.customId.startsWith('shop_owned_next_');
    return isOwnedButton || isSetActive || isOwnedSelect || isOwnedPrev || isOwnedNext ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const customIdParts = interaction.customId.split('_');
    const userId = customIdParts[2];
    let bgId = customIdParts[3] || null;
    let pageStr = customIdParts[4] || '0';

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

      // HANDLE SET ACTIVE
      if (interaction.customId.startsWith('shop_set_active_')) {
        const setActiveBgId = customIdParts[3];
        pageStr = customIdParts[4] || '0';

        // Set semua jadi non-active
        await UserBackground.updateMany({ discordId: userId }, { isActive: false });

        // Set selected jadi active
        await UserBackground.findOneAndUpdate(
          { discordId: userId, backgroundId: setActiveBgId },
          { isActive: true },
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle(t('commands/shop:set_active_success', { defaultValue: '✅ Background Activated' }))
          .setDescription('Your background has been set as active and will appear on your profile.');

        const backButton = new ButtonBuilder()
          .setCustomId(`shop_owned_${userId}_${parseInt(pageStr)}`)
          .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

        return interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }

      // PAGINATION
      const isPrevButton = interaction.customId.startsWith('shop_owned_prev_');
      const isNextButton = interaction.customId.startsWith('shop_owned_next_');

      if (isPrevButton || isNextButton) {
        const currentPage = parseInt(customIdParts[3], 10) || 0;
        const newPage = isPrevButton ? currentPage - 1 : currentPage + 1;
        pageStr = newPage.toString();
      }

      // SELECT MENU ACTION
      if (interaction.isStringSelectMenu()) {
        const selectedBgId = interaction.values[0];
        bgId = selectedBgId;

        // Set semua jadi non-active
        await UserBackground.updateMany({ discordId: userId }, { isActive: false });

        // Set selected jadi active
        await UserBackground.findOneAndUpdate(
          { discordId: userId, backgroundId: selectedBgId },
          { isActive: true },
        );

        const embed = new EmbedBuilder()
          .setColor(COLORS.success)
          .setTitle(t('commands/shop:set_active_success', { defaultValue: '✅ Background Activated' }))
          .setDescription('Your background has been set as active and will appear on your profile.');

        const backButton = new ButtonBuilder()
          .setCustomId(`shop_owned_${userId}_${pageStr}`)
          .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

        return interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }

      // RENDER OWNED LIST
      return this.renderOwnedList(interaction, userId, parseInt(pageStr, 10), t);
    } catch (error) {
      this.container.logger.error(error);
      await interaction.editReply({
        content: t('commands/shop:error', { defaultValue: '❌ An error occurred.' }),
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  }

  private async renderOwnedList(interaction: ButtonInteraction | StringSelectMenuInteraction, userId: string, page: number, t: any) {
    try {
      // Get owned backgrounds
      const ownedBackgrounds = await UserBackground.find({ discordId: userId }).lean();

      if (!ownedBackgrounds.length) {
        return interaction.editReply({
          content: t('commands/shop:no_owned_backgrounds', { defaultValue: '📭 You don\'t own any backgrounds yet!' }),
          embeds: [],
          components: [],
        });
      }

      // Get background info
      const allBgs = getAllBackgrounds();
      const bgMap = new Map(allBgs.map((bg) => [bg.id, bg]));

      // Combine owned + info
      const ownedWithInfo = ownedBackgrounds
        .map((owned) => ({
          ...owned,
          info: bgMap.get(owned.backgroundId),
        }))
        .filter((x) => x.info); // Filter yang ada di registry

      if (!ownedWithInfo.length) {
        return interaction.editReply({
          content: t('commands/shop:no_owned_backgrounds', { defaultValue: '📭 You don\'t own any backgrounds yet!' }),
          embeds: [],
          components: [],
        });
      }

      // Pagination
      const totalPages = Math.ceil(ownedWithInfo.length / ITEMS_PER_PAGE);
      page = Math.max(0, Math.min(page, totalPages - 1));
      const startIndex = page * ITEMS_PER_PAGE;
      const pageItems = ownedWithInfo.slice(startIndex, startIndex + ITEMS_PER_PAGE);

      // Render embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(t('commands/shop:my_backgrounds', { defaultValue: '🖼️ My Backgrounds' }))
        .setDescription(`You own **${ownedWithInfo.length}** background${ownedWithInfo.length !== 1 ? 's' : ''}`);

      const itemLines = pageItems.map((item) => {
        const statusEmoji = item.isActive ? '✅' : '⭕';
        return `${statusEmoji} ${item.info!.id === 'default' ? '📌' : item.info!.emoji} **${item.info!.name}**`;
      });

      embed.addFields({
        name: t('commands/shop:backgrounds_list', { defaultValue: 'Owned Backgrounds' }),
        value: itemLines.join('\n'),
      });

      if (ownedWithInfo.length > ITEMS_PER_PAGE) {
        embed.setFooter({ text: `Page ${page + 1}/${totalPages}` });
      }

      const components: ActionRowBuilder<any>[] = [];

      // Select menu untuk pilih background
      const selectOptions = pageItems.map((item) => ({
        label: item.info!.name.slice(0, 100),
        value: item.backgroundId,
        description: `${item.isActive ? '✅ Active' : 'Inactive'} • ${item.info!.rarity}`,
        emoji: item.info!.emoji || '🖼️',
      }));

      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`shop_owned_select_${userId}_${page}`)
            .setPlaceholder(t('commands/shop:select_background', { defaultValue: 'Select a background to activate' }))
            .addOptions(selectOptions),
        ),
      );

      // Pagination buttons
      if (ownedWithInfo.length > ITEMS_PER_PAGE) {
        const prevButton = new ButtonBuilder()
          .setCustomId(`shop_owned_prev_${userId}_${page}`)
          .setLabel(t('common:ui.prev', { defaultValue: '◀ Previous' }))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0);

        const nextButton = new ButtonBuilder()
          .setCustomId(`shop_owned_next_${userId}_${page}`)
          .setLabel(t('common:ui.next', { defaultValue: 'Next ▶' }))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(startIndex + ITEMS_PER_PAGE >= ownedWithInfo.length);

        components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
      }

      // Back button
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`shop_cat_${userId}_backgrounds_0`)
            .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
            .setStyle(ButtonStyle.Secondary),
        ),
      );

      await interaction.editReply({
        embeds: [embed],
        components,
      });
    } catch (error) {
      this.container.logger.error(error);
      throw error;
    }
  }
}
