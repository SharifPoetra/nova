import { Command } from '@sapphire/framework';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';

const PRICES = {
  common: 10,
  uncommon: 25,
  rare: 75,
  epic: 200,
  legendary: 1000,
};

export class SellCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: 'sell',
      description: 'Jual ikan dari inventory',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((opt) =>
          opt
            .setName('type')
            .setDescription('Jual berdasarkan rarity')
            .setRequired(true)
            .addChoices(
              { name: 'All (kecuali legendary)', value: 'all' },
              { name: 'Common', value: 'common' },
              { name: 'Uncommon', value: 'uncommon' },
              { name: 'Rare', value: 'rare' },
              { name: 'Epic', value: 'epic' },
              { name: 'Legendary', value: 'legendary' },
            ),
        )
        .addIntegerOption((opt) =>
          opt.setName('amount').setDescription('Jumlah (kosongkan = semua)').setMinValue(1),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const type = interaction.options.getString('type', true);
    const amountOpt = interaction.options.getInteger('amount');
    const userId = interaction.user.id;

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user || !user.inventory?.length) {
      return interaction.editReply('❌ Inventory kamu kosong!');
    }

    // Filter ikan
    let items =
      type === 'all'
        ? user.inventory.filter((i) => i.rarity !== 'legendary')
        : user.inventory.filter((i) => i.rarity === type);

    if (!items.length) {
      return interaction.editReply(`❌ Tidak ada ikan ${type} di inventory!`);
    }

    // Hitung total jual
    let toSell = [];
    let totalCoins = 0;

    for (const item of items) {
      const sellAmount = amountOpt ? Math.min(amountOpt, item.amount) : item.amount;
      if (sellAmount <= 0) continue;

      toSell.push({ ...item, sellAmount });
      totalCoins += sellAmount * PRICES[item.rarity as keyof typeof PRICES];
      if (amountOpt) break;
    }

    // Konfirmasi untuk epic/legendary
    const needConfirm = toSell.some((i) => ['epic', 'legendary'].includes(i.rarity));

    if (needConfirm) {
      const embed = new EmbedBuilder()
        .setColor('Orange')
        .setTitle('⚠️ Konfirmasi Penjualan')
        .setDescription(
          `Kamu akan menjual:\n${toSell.map((i) => `**${i.name}** [${i.rarity}] x${i.sellAmount} = ${i.sellAmount * PRICES[i.rarity as keyof typeof PRICES]} coins`).join('\n')}\n\n**Total: ${totalCoins} coins**\nYakin?`,
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('confirm').setLabel('Jual').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary),
      );

      const { resource: msg } = await interaction.editReply({
        embeds: [embed],
        components: [row],
        withResponse: true,
      });

      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 15000,
        max: 1,
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== userId) return i.reply({ content: 'Bukan punyamu!', ephemeral: true });

        if (i.customId === 'cancel') {
          return i.update({ content: '❌ Dibatalkan', embeds: [], components: [] });
        }

        await this.processSell(userId, toSell, totalCoins, i);
      });

      return;
    }

    // Langsung jual kalau common-uncommon-rare
    await this.processSell(userId, toSell, totalCoins, interaction);
  }

  private async processSell(userId: string, toSell: any[], totalCoins: number, interaction: any) {
    const user = await this.container.db.user.findOne({ discordId: userId });

    // Kurangi inventory
    for (const sell of toSell) {
      const idx = user.inventory.findIndex(
        (i: any) => i.name === sell.name && i.rarity === sell.rarity,
      );
      if (idx > -1) {
        user.inventory[idx].amount -= sell.sellAmount;
        if (user.inventory[idx].amount <= 0) user.inventory.splice(idx, 1);
      }
    }

    user.coins = (user.coins || 0) + totalCoins;
    await user.save();

    const embed = new EmbedBuilder()
      .setColor('Green')
      .setTitle('💰 Penjualan Berhasil')
      .setDescription(
        toSell
          .map(
            (i) =>
              `${i.name} [${i.rarity}] x${i.sellAmount} = ${i.sellAmount * PRICES[i.rarity as keyof typeof PRICES]} coins`,
          )
          .join('\n'),
      )
      .addFields(
        { name: 'Total', value: `+${totalCoins} coins`, inline: true },
        { name: 'Saldo', value: `${user.coins} coins`, inline: true },
      );

    if (interaction.update) {
      await interaction.update({ embeds: [embed], components: [] });
    } else {
      await interaction.editReply({ embeds: [embed] });
    }
  }
}
