import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { SHOP_CATEGORIES } from '../../lib/shop/categories';
import { formatNumber } from '../../lib/utils';

@ApplyOptions({
  name: 'shop',
  description: 'Buy items at Nova Shop',
  fullCategory: ['Economy'],
})
export class ShopCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:shop', 'commands/descriptions:shop'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply({
        content: t('common:need_start', { defaultValue: '❌ You need to start first. Use `/start`.' }),
      });
    }

    applyPassiveRegen(user);
    await user.save();

    // Main shop embed
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(t('commands/shop:title', { defaultValue: '🏪 Nova Shop' }))
      .setDescription(
        t('commands/shop:welcome', {
          defaultValue: 'Welcome to the Nova Shop! Select a category below to browse items.',
        }),
      )
      .addFields(
        Object.entries(SHOP_CATEGORIES).map(([key, cat]) => ({
          name: `${cat.emoji} ${cat.name}`,
          value: cat.description,
          inline: true,
        })),
      )
      .setFooter({
        text: t('commands/shop:balance_footer', {
          balance: formatNumber(user.balance),
          defaultValue: `Your balance: ${formatNumber(user.balance)} coins`,
        }),
      });

    // Category select menu - matches shopCategorySelect handler
    const categorySelect = new StringSelectMenuBuilder()
      .setCustomId(`shop_cat_${interaction.user.id}_main`)
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

    // Quick action buttons
    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`shop_owned_${interaction.user.id}_0`)
        .setLabel(t('commands/shop:my_backgrounds', { defaultValue: 'My Backgrounds' }))
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🖼️'),
      new ButtonBuilder()
        .setCustomId('shop_close')
        .setLabel(t('commands/shop:close', { defaultValue: 'Close' }))
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({
      embeds: [embed],
      components: [selectRow, buttons],
    });
  }
}
