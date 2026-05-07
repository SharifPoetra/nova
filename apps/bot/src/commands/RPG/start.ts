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
    await interaction.deferReply();
    const userId = interaction.user.id;

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (user?.class) {
      return interaction.editReply({
        content: `❌ Kamu sudah menjadi seorang **${user.class}**! Gunakan \`/profile\` untuk melihat statistikmu.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Selamat Datang di Nova Chronicles!')
      .setDescription(
        'Pilih salah satu Class di bawah ini untuk memulai petualanganmu. Pilihlah dengan bijak!',
      )
      .addFields(
        {
          name: '⚔️ Warrior',
          value: 'Stamina: **120** | ATK: **15**\n*Pertahanan kuat, stamina badak.*',
          inline: false,
        },
        {
          name: '🪄 Mage',
          value: 'Stamina: **80** | ATK: **25**\n*Serangan sihir dahsyat, tapi cepat lelah.*',
          inline: false,
        },
        {
          name: '🏹 Rogue',
          value: 'Stamina: **100** | ATK: **18**\n*Seimbang dengan peluang critical tinggi.*',
          inline: false,
        },
      )
      .setColor('Gold')
      .setFooter({ text: 'Klik tombol di bawah untuk memilih' });

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

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row],
      withResponse: true,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== userId) {
        return i.reply({ content: 'Bukan urusanmu! 😤', flags: MessageFlags.Ephemeral });
      }
      if (i.replied || i.deferred) return;

      let selectedClass: 'warrior' | 'mage' | 'rogue' = 'warrior';
      let stats = { hp: 120, atk: 15, maxStamina: 120 };

      if (i.customId === 'class_warrior') {
        selectedClass = 'warrior';
        stats = { hp: 120, atk: 15, maxStamina: 120 };
      } else if (i.customId === 'class_mage') {
        selectedClass = 'mage';
        stats = { hp: 80, atk: 25, maxStamina: 80 };
      } else if (i.customId === 'class_rogue') {
        selectedClass = 'rogue';
        stats = { hp: 100, atk: 18, maxStamina: 100 };
      }

      await this.container.db.user.findOneAndUpdate(
        { discordId: userId },
        {
          $set: {
            class: selectedClass,
            username: interaction.user.username,
            hp: stats.hp,
            maxHp: stats.hp,
            attack: stats.atk,
            maxStamina: stats.maxStamina,
            stamina: stats.maxStamina,
            level: 1,
            xp: 0,
            coins: 100, // bonus awal
            items: [],
          },
        },
        { upsert: true, returnDocument: 'after' },
      );

      await i.update({
        content: `✅ Selamat! Kamu sekarang adalah seorang **${selectedClass.toUpperCase()}**!\n⚡ Stamina: ${stats.maxStamina}/${stats.maxStamina} | 🗡️ ATK: ${stats.atk}`,
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
