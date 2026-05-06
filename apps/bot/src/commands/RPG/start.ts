import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
  MessageFlags,
} from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'start',
  description: 'Mulai petualanganmu di Nova Chronicles dan pilih Class!',
  fullCategory: ['RPG'],
})
export class StartCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const userId = interaction.user.id;

    // 1. Cek apakah user sudah punya class
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (user?.class) {
      return interaction.reply({
        content: `❌ Kamu sudah menjadi seorang **${user.class}**! Gunakan \`/profile\` untuk melihat statistikmu.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 2. Buat Embed Informasi Class
    const embed = new EmbedBuilder()
      .setTitle('🛡️ Selamat Datang di Nova Chronicles!')
      .setDescription(
        'Pilih salah satu Class di bawah ini untuk memulai petualanganmu. Pilihlah dengan bijak!',
      )
      .addFields(
        {
          name: '⚔️ Warrior',
          value: 'HP: **120** | ATK: **15**\n*Pertahanan kuat dan nyawa tebal.*',
          inline: false,
        },
        {
          name: '🪄 Mage',
          value: 'HP: **80** | ATK: **25**\n*Serangan sihir dahsyat, tapi fisik lemah.*',
          inline: false,
        },
        {
          name: '🏹 Rogue',
          value: 'HP: **100** | ATK: **18**\n*Seimbang dengan peluang critical tinggi.*',
          inline: false,
        },
      )
      .setColor('Gold')
      .setFooter({ text: 'Klik tombol di bawah untuk memilih' });

    // 3. Buat Tombol Interaktif
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('class_warrior')
        .setLabel('Warrior')
        .setEmoji('⚔️')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('class_mage')
        .setLabel('Mage')
        .setEmoji('🪄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('class_rogue')
        .setLabel('Rogue')
        .setEmoji('🏹')
        .setStyle(ButtonStyle.Success),
    );

    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
    });

    // 4. Kolektor Tombol (Hanya untuk user yang memanggil command)
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 1 menit waktu memilih
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: 'Bukan urusanmu! 😤', flags: MessageFlags.Ephemeral });
      }

      let selectedClass = '';
      let stats = { hp: 100, atk: 10 };

      if (i.customId === 'class_warrior') {
        selectedClass = 'Warrior';
        stats = { hp: 120, atk: 15 };
      } else if (i.customId === 'class_mage') {
        selectedClass = 'Mage';
        stats = { hp: 80, atk: 25 };
      } else if (i.customId === 'class_rogue') {
        selectedClass = 'Rogue';
        stats = { hp: 100, atk: 18 };
      }

      // 5. Update Database (Upsert agar aman)
      await this.container.db.user.findOneAndUpdate(
        { discordId: userId },
        {
          $set: {
            class: selectedClass,
            hp: stats.hp,
            maxHp: stats.hp,
            attack: stats.atk,
          },
        },
        { upsert: true },
      );

      // 6. Matikan tombol dan tampilkan hasil
      await i.update({
        content: `✅ Selamat! Kamu sekarang adalah seorang **${selectedClass}**!`,
        embeds: [],
        components: [],
      });

      collector.stop();
    });

    collector.on('end', (collected) => {
      if (collected.size === 0) {
        interaction.editReply({
          content: '⏳ Waktu habis. Silakan ketik `/start` lagi.',
          embeds: [],
          components: [],
        });
      }
    });
  }
}
