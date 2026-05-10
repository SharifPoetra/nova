import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

const SHOP_ITEMS = [
  {
    id: 'potion_stamina',
    name: 'Stamina Potion',
    emoji: '🧪',
    price: 150,
    desc: '+30 Stamina',
    effect: { stamina: 30 },
  },
  {
    id: 'potion_hp',
    name: 'HP Potion',
    emoji: '🍖',
    price: 100,
    desc: '+50 HP',
    effect: { hp: 50 },
  },
];

@ApplyOptions<Command.Options>({
  name: 'shop',
  description: 'Beli item di Nova Shop',
  detailedDescription: {
    usage: '/shop [item:optional]',
    examples: ['/shop', '/shop item:potion_stamina'],
    extendedHelp: `
Beli potion untuk lanjut grinding.

**Item tersedia:**
🧪 Stamina Potion — 150 koin → +30 stamina
🍖 HP Potion — 100 koin → +50 HP

**Cara pakai:**
1. /shop — buka katalog dengan tombol
2. /shop item:... — langsung beli

**Catatan:**
- Efek langsung aktif, tidak masuk inventory
- Stamina/HP tidak bisa melebihi max
- Wajib /start dulu

Tips: beli HP Potion sebelum /hunt, Stamina Potion untuk spam /fish atau /explore.
    `.trim(),
  },
  fullCategory: ['Economy'],
})
export class ShopCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('item')
            .setDescription('Pilih item yang ingin dibeli')
            .setRequired(false)
            .addChoices(
              ...SHOP_ITEMS.map((i) => ({
                name: `${i.emoji} ${i.name} - ${i.price} koin`,
                value: i.id,
              })),
            ),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Kamu belum terdaftar! Gunakan `/start` dulu.');

    applyPassiveRegen(user);
    await user.save();

    const choice = interaction.options.getString('item');
    if (choice) return this.handlePurchase(interaction, user, choice);

    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle('🏪 Nova Shop')
      .setDescription(
        SHOP_ITEMS.map((i) => `${i.emoji} **${i.name}**\n> ${i.desc} — **${i.price}** koin`).join(
          '\n\n',
        ),
      )
      .setFooter({ text: `Saldo: ${user.balance.toLocaleString('id-ID')} koin` });

    const rows = [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...SHOP_ITEMS.map((item) =>
          new ButtonBuilder()
            .setCustomId(`shop_${item.id}`)
            .setLabel(`${item.name}`)
            .setEmoji(item.emoji)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('shop_cancel')
          .setLabel('Tutup')
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
        return btn.update({ content: '🛒 Shop ditutup.', embeds: [], components: [] });
      }
      const itemId = btn.customId.replace('shop_', '');
      collector.stop();
      await btn.deferUpdate();
      await this.handlePurchase(interaction, user, itemId, true);
    });

    collector.on('end', () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  }

  private async handlePurchase(
    interaction: Command.ChatInputCommandInteraction,
    user: any,
    itemId: string,
    fromButton = false,
  ) {
    const item = SHOP_ITEMS.find((i) => i.id === itemId)!;

    if (Number(user.balance) < item.price) {
      const msg = `❌ Koin tidak cukup! Butuh **${item.price}**, kamu punya **${user.balance}**.`;
      return fromButton
        ? interaction.editReply({ content: msg, embeds: [], components: [] })
        : interaction.editReply(msg);
    }

    const confirmEmbed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('Konfirmasi Pembelian')
      .setDescription(
        `${item.emoji} **${item.name}**\n${item.desc}\n\nHarga: **${item.price}** koin`,
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('buy').setLabel('Beli').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary),
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
        return i.update({ content: '❌ Pembelian dibatalkan.', embeds: [], components: [] });

      user.balance = Number(user.balance) - item.price;
      if (item.effect.stamina)
        user.stamina = Math.min(user.maxStamina ?? 100, (user.stamina ?? 0) + item.effect.stamina);
      if (item.effect.hp) user.hp = Math.min(user.maxHp ?? 100, (user.hp ?? 0) + item.effect.hp);
      await user.save();

      const successEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Pembelian Berhasil')
        .setDescription(`${item.emoji} **${item.name}** telah digunakan!`)
        .addFields(
          { name: '💰 Saldo', value: `${user.balance.toLocaleString('id-ID')} koin`, inline: true },
          { name: '⚡ Stamina', value: `${user.stamina}/${user.maxStamina}`, inline: true },
          { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
        );

      await i.update({ embeds: [successEmbed], components: [] });
    });
  }
}
