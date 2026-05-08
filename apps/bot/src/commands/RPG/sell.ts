import { Command } from '@sapphire/framework';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

export class SellCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, { ...options, name: 'sell', description: 'Jual ikan/material' });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Rarity')
            .setRequired(true)
            .addChoices(
              { name: 'All', value: 'all' },
              { name: 'Common', value: 'Common' },
              { name: 'Uncommon', value: 'Uncommon' },
              { name: 'Rare', value: 'Rare' },
              { name: 'Epic', value: 'Epic' },
              { name: 'Legendary', value: 'Legendary' },
            ),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const type = interaction.options.getString('type', true);
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Kamu belum terdaftar! Gunakan `/start` dulu.');

    // === REGEN PASIF ===
    applyPassiveRegen(user);

    if (!user.items?.length) {
      await user.save();
      return interaction.editReply('❌ Inventory kosong!');
    }

    // Populate items
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
      return interaction.editReply(`❌ Tidak ada item ${type}!`);
    }

    const total = toSell.reduce((sum, i) => sum + i.qty * Number(i.data!.sellPrice), 0);
    const needConfirm = toSell.some((i) => ['Rare', 'Epic', 'Legendary'].includes(i.data!.rarity));

    const embed = new EmbedBuilder()
      .setColor(needConfirm ? 0xe67e22 : 0x2ecc71)
      .setTitle('💰 Penjualan')
      .setDescription(
        toSell
          .map(
            (i) =>
              `${i.data!.emoji} **${i.data!.name}** x${i.qty} — ${(
                i.qty * i.data!.sellPrice
              ).toLocaleString('id-ID')} koin`,
          )
          .join('\n'),
      )
      .addFields({ name: 'Total', value: `+${total.toLocaleString('id-ID')} koin` });

    if (!needConfirm) {
      // langsung jual
      user.balance = Number(user.balance) + total;
      user.items = user.items.filter((ui) => !toSell.some((ts) => ts.itemId === ui.itemId));
      await user.save();
      embed.addFields({ name: '💰 Saldo', value: `${user.balance.toLocaleString('id-ID')} koin` });
      return interaction.editReply({ embeds: [embed] });
    }

    // dengan tombol
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('yes').setLabel('Jual').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('no').setLabel('Batal').setStyle(ButtonStyle.Secondary),
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
        await user.save(); // simpan regen walaupun batal
        return i.update({ content: '❌ Dibatalkan', embeds: [], components: [] });
      }

      user.balance = Number(user.balance) + total;
      user.items = user.items.filter((ui) => !toSell.some((ts) => ts.itemId === ui.itemId));
      await user.save();
      embed.addFields({ name: '💰 Saldo', value: `${user.balance.toLocaleString('id-ID')} koin` });
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
