import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

@ApplyOptions<Command.Options>({
  name: 'sell',
  description: 'Sell fish/materials',
  fullCategory: ['RPG'],
})
export class SellCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(
        builder
          .setName(this.name)
          .setDescription(this.container.i18n.t('commands/descriptions:sell'))
          .addStringOption((o) =>
            o
              .setName('type')
              .setDescription(this.container.i18n.t('commands/sell:option_desc'))
              .setRequired(true)
              .addChoices(
                { name: this.container.i18n.t('commands/sell:choice_all'), value: 'all' },
                { name: 'Common', value: 'Common' },
                { name: 'Uncommon', value: 'Uncommon' },
                { name: 'Rare', value: 'Rare' },
                { name: 'Epic', value: 'Epic' },
                { name: 'Legendary', value: 'Legendary' },
              ),
          ),
        'commands/names:sell',
        'commands/descriptions:sell',
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const type = interaction.options.getString('type', true);
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply(t('common:need_start'));

    applyPassiveRegen(user);

    if (!user.items?.length) {
      await user.save();
      return interaction.editReply(
        t('commands/sell:empty', { defaultValue: '❌ Inventory empty!' }),
      );
    }

    const itemIds = user.items.map((i) => i.itemId);
    const dbItems = await this.container.db.item.find({ itemId: { $in: itemIds } });
    const itemMap = new Map(dbItems.map((i) => [i.itemId, i]));

    const toSell = user.items
      .map((ui) => ({ itemId: ui.itemId, qty: ui.qty, data: itemMap.get(ui.itemId) }))
      .filter(
        (ui) =>
          ui.data && (type === 'all' ? ui.data.rarity !== 'Legendary' : ui.data.rarity === type),
      );

    if (!toSell.length) {
      await user.save();
      return interaction.editReply(
        t('commands/sell:none', {
          type: t(`commands/sell:type_${type}`, { defaultValue: type }),
          defaultValue: `❌ No ${type} items!`,
        }),
      );
    }

    const total = toSell.reduce((sum, i) => sum + i.qty * Number(i.data!.sellPrice), 0);
    const needConfirm = toSell.some((i) => ['Rare', 'Epic', 'Legendary'].includes(i.data!.rarity));

    const embed = new EmbedBuilder()
      .setColor(needConfirm ? 0xe67e22 : 0x2ecc71)
      .setTitle(t('commands/sell:title', { defaultValue: '💰 Sale' }))
      .setDescription(
        toSell
          .map(
            (i) =>
              `${i.data!.emoji} **${i.data!.name}** x${i.qty} — ${(i.qty * i.data!.sellPrice).toLocaleString(interaction.locale)} ${t('commands/sell:coins', { defaultValue: 'coins' })}`,
          )
          .join('\n'),
      )
      .addFields({
        name: t('commands/sell:total', { defaultValue: 'Total' }),
        value: `+${total.toLocaleString(interaction.locale)} ${t('commands/sell:coins')}`,
      });

    if (!needConfirm) {
      user.balance = Number(user.balance) + total;
      user.items = user.items.filter((ui) => !toSell.some((ts) => ts.itemId === ui.itemId));
      await user.save();
      embed.addFields({
        name: t('commands/sell:balance', { defaultValue: '💰 Balance' }),
        value: `${user.balance.toLocaleString(interaction.locale)} ${t('commands/sell:coins')}`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('yes')
        .setLabel(t('commands/sell:confirm_yes', { defaultValue: 'Sell' }))
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('no')
        .setLabel(t('commands/sell:confirm_no', { defaultValue: 'Cancel' }))
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();

    const col = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      filter: (btn) => btn.user.id === interaction.user.id,
      max: 1,
    });

    col.on('collect', async (i) => {
      if (i.customId === 'no') {
        await user.save();
        return i.update({
          content: t('commands/sell:cancelled', { defaultValue: '❌ Cancelled' }),
          embeds: [],
          components: [],
        });
      }

      user.balance = Number(user.balance) + total;
      user.items = user.items.filter((ui) => !toSell.some((ts) => ts.itemId === ui.itemId));
      await user.save();
      embed.addFields({
        name: t('commands/sell:balance'),
        value: `${user.balance.toLocaleString(interaction.locale)} ${t('commands/sell:coins')}`,
      });
      await i.update({ embeds: [embed], components: [] });
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') {
        user.save().catch(() => {});
        interaction.editReply({ components: [] }).catch(() => {});
      }
    });
  }
}
