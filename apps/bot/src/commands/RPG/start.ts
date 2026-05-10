import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { CLASSES, getClass } from '../lib/rpg/classes';

@ApplyOptions<Command.Options>({
  name: 'start',
  description: 'Mulai petualanganmu di Nova Chronicles dan pilih Class!',
  fullCategory: ['RPG'],
  detailedDescription: {
    usage: '/start',
    extendedHelp: `Pilih 1 dari 3 class (**tidak bisa diganti**):

${Object.values(CLASSES)
  .map(
    (c) =>
      `${c.emoji} **${c.name}**
> HP ${c.hp} | ATK ${c.atk}
> Passive: ${c.passive}`,
  )
  .join('\n\n')}

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
      const existing = getClass(user.class);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle('😅 Kamu Sudah Punya Class')
        .setDescription(
          `Kamu sudah terdaftar sebagai **${existing?.name ?? user.class}**.\n` +
            `Class tidak bisa diganti, jadi lanjutkan aja petualanganmu!`,
        )
        .setColor(existing?.color ?? 0x95a5a6)
        .setFooter({ text: 'Gunakan /profile untuk melihat status' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const classList = Object.values(CLASSES);

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Nova Chronicles — Pilih Takdirmu')
      .setDescription(
        `Selamat datang, **${interaction.user.username}**!\n` +
          `Dunia Nova lagi kacau, pilih class-mu sekarang dan langsung dapat **1.000 koin** buat modal awal.`,
      )
      .addFields(
        classList.map((c) => ({
          name: `${c.emoji} ${c.name}`,
          value: `**${c.desc}**\n❤️ ${c.hp} HP | 🗡️ ${c.atk} ATK | ⚡ ${c.stamina} Stamina\n*Passive: ${c.passive}*`,
          inline: false,
        })),
      )
      .setColor(0xf1c40f)
      .setFooter({ text: 'Pilih dengan bijak — class tidak bisa diganti!' })
      .setThumbnail(interaction.user.displayAvatarURL());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      classList.map((c) =>
        new ButtonBuilder()
          .setCustomId(`class_${c.key}_${userId}`)
          .setLabel(c.name)
          .setEmoji(c.emoji)
          .setStyle(
            c.key === 'warrior'
              ? ButtonStyle.Danger
              : c.key === 'mage'
                ? ButtonStyle.Primary
                : ButtonStyle.Success,
          ),
      ),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
}
