import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

@ApplyOptions<Command.Options>({
  name: 'sell',
  description: 'Jual ikan/material',
  detailedDescription: {
    usage: '/sell type:<rarity>',
    examples: ['/sell type:all', '/sell type:Rare', '/sell type:Legendary'],
    extendedHelp: `
Jual item dari inventory untuk koin.

**Pilihan type:**
- all — jual semua kecuali Legendary (aman)
- Common / Uncommon — langsung terjual
- Rare / Epic / Legendary — perlu konfirmasi tombol

**Catatan:**
- Item dari /fish, /hunt, /explore bisa dijual
- Legendary tidak ikut 'all' untuk mencegah salah jual
- Gunakan /inventory dulu untuk cek total nilai

Tip: simpan Rare+ untuk /cook, jual Common/Uncommon saja untuk farming cepat.
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class SellCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('Rarity yang mau dijual')
            .setRequired(true)
            .addChoices(
              { name: 'All (kecuali Legendary)', value: 'all' },
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

    applyPassiveRegen(user);

    if (!user.items?.length) {
      await user.save();
      return interaction.editReply('❌ Inventory kosong!');
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
              `${i.data!.emoji} **${i.data!.name}** x${i.qty} — ${(i.qty * i.data!.sellPrice).toLocaleString('id-ID')} koin`,
          )
          .join('\n'),
      )
      .addFields({ name: 'Total', value: `+${total.toLocaleString('id-ID')} koin` });

    if (!needConfirm) {
      user.balance = Number(user.balance) + total;
      user.items = user.items.filter((ui) => !toSell.some((ts) => ts.itemId === ui.itemId));
      await user.save();
      embed.addFields({ name: '💰 Saldo', value: `${user.balance.toLocaleString('id-ID')} koin` });
      return interaction.editReply({ embeds: [embed] });
    }

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
        await user.save();
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
