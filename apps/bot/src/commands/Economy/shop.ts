import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

import shopEn from '../../locales/en-US/commands/shop.json';
import shopId from '../../locales/id/commands/shop.json';
import shopEnGb from '../../locales/en-GB/commands/shop.json';

const SHOP_ITEMS = [
  { id: 'potion_stamina', key: 'stamina', emoji: '🧪', price: 150, effect: { stamina: 30 } },
  { id: 'potion_hp', key: 'hp', emoji: '🍖', price: 100, effect: { hp: 50 } },
];

@ApplyOptions<Command.Options>({
  name: 'shop',
  description: 'Buy items at Nova Shop',
  fullCategory: ['Economy'],
})
export class ShopCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:shop', 'commands/descriptions:shop').addStringOption(
        (o) =>
          o
            .setName('item')
            .setNameLocalizations({ id: 'item', 'en-US': 'item' })
            .setDescription(shopEn.option_desc)
            .setDescriptionLocalizations({
              id: shopId.option_desc,
              'en-US': shopEn.option_desc,
              'en-GB': shopEnGb.option_desc,
            })
            .setRequired(false)
            .addChoices(
              ...SHOP_ITEMS.map((i) => ({
                name: `${i.emoji} ${shopEn[`item_${i.key}_name`]} - ${i.price} coins`,
                value: i.id,
                name_localizations: {
                  id: `${i.emoji} ${shopId[`item_${i.key}_name`]} - ${i.price} koin`,
                  'en-US': `${i.emoji} ${shopEn[`item_${i.key}_name`]} - ${i.price} coins`,
                  'en-GB': `${i.emoji} ${shopEnGb[`item_${i.key}_name`]} - ${i.price} coins`,
                },
              })),
            ),
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply(t('common:need_start'));
    applyPassiveRegen(user);
    await user.save();

    const choice = interaction.options.getString('item');
    if (choice) return this.handlePurchase(interaction, user, choice, t);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle(t('commands/shop:title', { defaultValue: '🏪 Nova Shop' }))
      .setDescription(
        SHOP_ITEMS.map((i) =>
          t(`commands/shop:item_${i.key}_line`, {
            emoji: i.emoji,
            name: t(`commands/shop:item_${i.key}_name`),
            desc: t(`commands/shop:item_${i.key}_desc`),
            price: i.price,
            defaultValue: `${i.emoji} **${i.key}**\n> desc — **${i.price}** coins`,
          }),
        ).join('\n\n'),
      )
      .setFooter({
        text: t('commands/shop:balance_footer', {
          balance: user.balance.toLocaleString(interaction.locale),
          defaultValue: `Balance: ${user.balance} coins`,
        }),
      });

    const rows = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...SHOP_ITEMS.map((item) =>
          new ButtonBuilder()
            .setCustomId(`shop_${item.id}`)
            .setLabel(t(`commands/shop:item_${item.key}_name`))
            .setEmoji(item.emoji)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_cancel')
          .setLabel(t('commands/shop:close', { defaultValue: 'Close' }))
          .setStyle(ButtonStyle.Secondary),
      ),
    ];

    await interaction.editReply({ embeds: [embed], components: rows });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000,
      filter: (b) => b.user.id === interaction.user.id,
    });

    collector.on('collect', async (btn) => {
      if (btn.customId === 'shop_cancel') {
        collector.stop();
        return btn.update({
          content: t('commands/shop:closed', { defaultValue: '🛒 Shop closed.' }),
          embeds: [],
          components: [],
        });
      }
      const itemId = btn.customId.replace('shop_', '');
      collector.stop();
      await btn.deferUpdate();
      await this.handlePurchase(interaction, user, itemId, t, true);
    });
    collector.on('end', () => interaction.editReply({ components: [] }).catch(() => {}));
  }

  private async handlePurchase(
    interaction: Command.ChatInputCommandInteraction,
    user: any,
    itemId: string,
    t: any,
    fromButton = false,
  ) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId)!;
    if (Number(user.balance) < item.price) {
      const msg = t('commands/shop:no_money', {
        price: item.price,
        balance: user.balance,
        defaultValue: `❌ Not enough coins! Need **${item.price}**, you have **${user.balance}**.`,
      });
      return fromButton
        ? interaction.editReply({ content: msg, embeds: [], components: [] })
        : interaction.editReply(msg);
    }
    //... sisanya sama seperti file kamu (confirm, success) — tidak diubah
    const confirmEmbed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle(t('commands/shop:confirm_title', { defaultValue: 'Purchase Confirmation' }))
      .setDescription(
        t('commands/shop:confirm_desc', {
          emoji: item.emoji,
          name: t(`commands/shop:item_${item.key}_name`),
          desc: t(`commands/shop:item_${item.key}_desc`),
          price: item.price,
          defaultValue: `${item.emoji} **name**\ndesc\n\nPrice: **${item.price}** coins`,
        }),
      );
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('buy')
        .setLabel(t('commands/shop:buy', { defaultValue: 'Buy' }))
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel(t('commands/shop:cancel', { defaultValue: 'Cancel' }))
        .setStyle(ButtonStyle.Secondary),
    );
    await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
    const msg = await interaction.fetchReply();
    const col = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      filter: (b: any) => b.user.id === interaction.user.id,
      max: 1,
    });
    col.on('collect', async (i: any) => {
      if (i.customId === 'cancel')
        return i.update({
          content: t('commands/shop:cancelled', { defaultValue: '❌ Purchase cancelled.' }),
          embeds: [],
          components: [],
        });
      user.balance = Number(user.balance) - item.price;
      if (item.effect.stamina)
        user.stamina = Math.min(user.maxStamina ?? 100, (user.stamina ?? 0) + item.effect.stamina);
      if (item.effect.hp) user.hp = Math.min(user.maxHp ?? 100, (user.hp ?? 0) + item.effect.hp);
      await user.save();
      const successEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle(t('commands/shop:success_title', { defaultValue: '✅ Purchase Successful' }))
        .setDescription(
          t('commands/shop:success_desc', {
            emoji: item.emoji,
            name: t(`commands/shop:item_${item.key}_name`),
            defaultValue: `${item.emoji} **name** used!`,
          }),
        )
        .addFields(
          {
            name: t('commands/shop:field_balance', { defaultValue: '💰 Balance' }),
            value: `${user.balance.toLocaleString(interaction.locale)} ${t('commands/shop:coins', { defaultValue: 'coins' })}`,
            inline: true,
          },
          {
            name: t('commands/shop:field_stamina', { defaultValue: '⚡ Stamina' }),
            value: `${user.stamina}/${user.maxStamina}`,
            inline: true,
          },
          {
            name: t('commands/shop:field_hp', { defaultValue: '❤️ HP' }),
            value: `${user.hp}/${user.maxHp}`,
            inline: true,
          },
        );
      await i.update({ embeds: [successEmbed], components: [] });
    });
  }
}
