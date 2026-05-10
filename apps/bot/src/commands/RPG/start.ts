import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'start',
  description: 'Mulai petualanganmu di Nova Chronicles dan pilih Class!',
  fullCategory: ['RPG'],
  detailedDescription: {
    usage: '/start',
    extendedHelp: `Pilih 1 dari 3 class (**tidak bisa diganti**):

🛡️ **Warrior**
> HP 120 | ATK 15
> Passive: 20% chance block 30% damage

🪄 **Mage**
> HP 80 | ATK 22
> Passive: 15% chance lifesteal 25%

🏹 **Rogue**
> HP 95 | ATK 18
> Passive: Crit rate 18% (base 10%)

Ketik \`/start\` lalu klik tombol class.`,
  },
})
export class StartCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    const user = await this.container.db.user.findOne({ discordId: userId });

    if (user?.class) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle('😅 Kamu Sudah Punya Class')
        .setDescription(
          `Kamu sudah terdaftar sebagai **${user.class.charAt(0).toUpperCase() + user.class.slice(1)}**.\n` +
            `Class tidak bisa diganti, jadi lanjutkan aja petualanganmu!`,
        )
        .setColor(0x95a5a6)
        .setFooter({ text: 'Gunakan /profile untuk melihat status' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Nova Chronicles — Pilih Takdirmu')
      .setDescription(
        `Selamat datang, **${interaction.user.username}**!\n` +
          `Dunia Nova lagi kacau, pilih class-mu sekarang dan langsung dapat **1.000 koin** buat modal awal.`,
      )
      .addFields(
        {
          name: '⚔️ Warrior',
          value:
            '**Tank garis depan**\n❤️ 120 HP | 🗡️ 15 ATK | ⚡ 120 Stamina\n*Cocok buat yang suka tabrak dulu, mikir belakangan.*',
          inline: false,
        },
        {
          name: '🪄 Mage',
          value:
            '**Damage meledak**\n❤️ 80 HP | 🗡️ 25 ATK | ⚡ 80 Stamina\n*Glass cannon, sekali combo musuh hilang.*',
          inline: false,
        },
        {
          name: '🏹 Rogue',
          value:
            '**Lincah & kritikal**\n❤️ 100 HP | 🗡️ 18 ATK | ⚡ 100 Stamina\n*Main aman, crit sering, hunt jadi cepat.*',
          inline: false,
        },
      )
      .setColor(0xf1c40f)
      .setFooter({ text: 'Pilih dengan bijak — class tidak bisa diganti!' })
      .setThumbnail(interaction.user.displayAvatarURL());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`class_warrior_${userId}`)
        .setLabel('Warrior')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`class_mage_${userId}`)
        .setLabel('Mage')
        .setEmoji('🪄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`class_rogue_${userId}`)
        .setLabel('Rogue')
        .setEmoji('🏹')
        .setStyle(ButtonStyle.Success),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
}
