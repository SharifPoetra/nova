import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { User } from '@nova/db';

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
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Kamu belum terdaftar! Gunakan `/start` dulu.');

    const choice = interaction.options.getString('item');

    if (!choice) {
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🏪 Nova Shop')
        .setDescription(
          SHOP_ITEMS.map((i) => `${i.emoji} **${i.name}**\n> ${i.desc} — **${i.price}** koin`).join(
            '\n\n',
          ),
        )
        .setFooter({
          text: `Saldo: ${user.balance.toLocaleString('id-ID')} koin • /shop item:... untuk beli`,
        });
      return interaction.editReply({ embeds: [embed] });
    }

    const item = SHOP_ITEMS.find((i) => i.id === choice)!;
    if (Number(user.balance) < item.price) {
      return interaction.editReply(
        `❌ Koin tidak cukup! Butuh **${item.price}**, kamu punya **${user.balance}**.`,
      );
    }

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setTitle('Konfirmasi Pembelian')
      .setDescription(
        `${item.emoji} **${item.name}**\n${item.desc}\n\nHarga: **${item.price}** koin`,
      );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('buy').setLabel('Beli').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [embed], components: [row] });
    const msg = await interaction.fetchReply();

    const col = (msg as any).createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 15000,
      filter: (b: any) => b.user.id === interaction.user.id,
      max: 1,
    });

    col.on('collect', async (i: any) => {
      if (i.customId === 'cancel')
        return i.update({ content: '❌ Pembelian dibatalkan.', embeds: [], components: [] });

      user.balance = Number(user.balance) - item.price;

      if (item.effect.stamina) {
        user.stamina = Math.min(user.maxStamina ?? 100, (user.stamina ?? 0) + item.effect.stamina);
      }
      if (item.effect.hp) {
        user.hp = Math.min(user.maxHp ?? 100, (user.hp ?? 0) + item.effect.hp);
      }

      await user.save();

      embed
        .setColor(0x2ecc71)
        .setTitle('✅ Pembelian Berhasil')
        .setDescription(`${item.emoji} **${item.name}** telah ditambahkan!`)
        .addFields(
          { name: '💰 Saldo', value: `${user.balance.toLocaleString('id-ID')} koin`, inline: true },
          { name: '⚡ Stamina', value: `${user.stamina}/${user.maxStamina}`, inline: true },
        );

      await i.update({ embeds: [embed], components: [] });
    });

    col.on('end', (_, reason) => {
      if (reason === 'time') interaction.editReply({ components: [] }).catch(() => {});
    });
  }
}
