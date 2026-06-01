import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getItemById, type ShopCategory } from '../../lib/shop/categories';
import { COLORS, formatNumber } from '../../lib/utils';
import { addItemToInventory } from '../../lib/rpg/inventory';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { UserBackground } from '@nova/db';

@ApplyOptions({
  name: 'shopConfirm',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class ShopConfirmHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.isButton() && interaction.customId.startsWith('shop_confirm_') ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction) {
    const t = await fetchT(interaction);
    const customIdParts = interaction.customId.split('_');
    const userId = customIdParts[2];
    const category = customIdParts[3] as ShopCategory;
    const itemId = customIdParts[4];
    const pageStr = customIdParts[5] || '0';

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

      applyPassiveRegen(user);

      // Get item
      const item = getItemById(category, itemId);
      if (!item) {
        return interaction.editReply({
          content: t('commands/shop:item_not_found', { defaultValue: '❌ Item not found.' }),
          embeds: [],
          components: [],
        });
      }

      // Check balance
      if (user.balance < item.price) {
        const embed = new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle(t('commands/shop:insufficient_title', { defaultValue: '❌ Insufficient Balance' }))
          .setDescription(
            `You need **${formatNumber(item.price - user.balance)}** more coins to buy this item.`,
          );

        const backButton = new ButtonBuilder()
          .setCustomId(`shop_item_${userId}_${category}_${pageStr}`)
          .setLabel(t('common:ui.back', { defaultValue: 'Back' }))
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(backButton);

        return interaction.editReply({
          embeds: [embed],
          components: [row],
        });
      }

      // PROCESS PURCHASE
      user.balance -= item.price;

      if (category === 'potions') {
        // Add potion to inventory
        await addItemToInventory(
          user,
          {
            itemId: item.id,
            emoji: item.emoji,
            type: 'consumable',
            rarity: item.rarity || 'Common',
            sellPrice: Math.floor(item.price * 0.5), // Sell price 50% dari harga beli
            effects: [
              item.id === 'potion_hp'
                ? { type: 'heal' as const, value: 50 }
                : { type: 'stamina' as const, value: 30 },
            ],
          },
          1,
        );
      } else if (category === 'backgrounds') {
        // Create background record
        const bgId = item.id.replace('bg_', '');

        // Set semua background user jadi non-active dulu
        await UserBackground.updateMany({ discordId: userId }, { isActive: false });

        // Create/update background record
        await UserBackground.findOneAndUpdate(
          { discordId: userId, backgroundId: bgId },
          {
            discordId: userId,
            backgroundId: bgId,
            isActive: true,
            purchasedAt: new Date(),
            favorited: false,
          },
          { upsert: true },
        );
      }

      await user.save();

      // Success embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(t('commands/shop:success_title', { defaultValue: '✅ Purchase Successful' }))
        .setDescription(
          `${item.emoji} **${item.name}** purchased!\n\n` +
            `**Price:** ${formatNumber(item.price)} 💰\n` +
            `**New balance:** ${formatNumber(user.balance)} 💰`,
        );

      if (category === 'backgrounds') {
        embed.addFields({
          name: '🎨 Status',
          value: 'Background set as active',
        });
      } else {
        embed.addFields({
          name: '📦 Inventory',
          value: t('commands/shop:use_hint', { defaultValue: 'Use `/inventory` to use this item' }),
        });
      }

      const buttons = [
        new ButtonBuilder()
          .setCustomId(`shop_cat_${userId}_${category}_0`)
          .setLabel(t('commands/shop:continue_shopping', { defaultValue: 'Continue Shopping' }))
          .setStyle(ButtonStyle.Primary),
      ];

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await interaction.editReply({
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      this.container.logger.error(error);
      await interaction.editReply({
        content: t('commands/shop:error', { defaultValue: '❌ An error occurred.' }),
        embeds: [],
        components: [],
      }).catch(() => {});
    }
  }
}
