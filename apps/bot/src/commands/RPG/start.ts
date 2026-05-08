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
        content: `❌ Kamu sudah menjadi seorang **${user.class.toUpperCase()}**! Gunakan \`/profile\` untuk melihat statistikmu.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🛡️ Selamat Datang di Nova Chronicles!')
      .setDescription('Pilih Class untuk memulai. Bonus awal **1.000 koin**!')
      .addFields(
        {
          name: '⚔️ Warrior',
          value:
            'HP: **120** | ATK: **15** | Stamina: **120**\n*Tahan banting, cocok untuk hunt lama.*',
          inline: false,
        },
        {
          name: '🪄 Mage',
          value: 'HP: **80** | ATK: **25** | Stamina: **80**\n*Damage besar, cepat habis stamina.*',
          inline: false,
        },
        {
          name: '🏹 Rogue',
          value:
            'HP: **100** | ATK: **18** | Stamina: **100**\n*Seimbang, crit lebih sering di hunt.*',
          inline: false,
        },
      )
      .setColor(0xf1c40f)
      .setFooter({ text: 'Pilih dalam 60 detik' });

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
      if (i.user.id !== userId)
        return i.reply({ content: 'Bukan pilihanmu!', flags: MessageFlags.Ephemeral });
      if (i.replied || i.deferred) return;

      let selectedClass: 'warrior' | 'mage' | 'rogue' = 'warrior';
      let stats = { hp: 120, atk: 15, maxStamina: 120 };

      if (i.customId === 'class_mage') {
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
            exp: 0,
            balance: 1000,
            bank: 0,
            items: [],
            createdAt: new Date(),
            lastExplore: null,
            lastFish: null,
            lastHunt: null,
          },
        },
        { upsert: true },
      );

      await i.update({
        content: `✅ Selamat datang, **${selectedClass.toUpperCase()}**!\n💰 **+1.000 koin** telah masuk ke dompetmu.\n⚡ Stamina: ${stats.maxStamina} | 🗡️ ATK: ${stats.atk} | ❤️ HP: ${stats.hp}\n\n> Lanjut: \`/profile\` → \`/hunt\``,
        embeds: [],
        components: [],
      });
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        interaction.editReply({
          content: '⏳ Waktu habis. Ketik `/start` lagi.',
          embeds: [],
          components: [],
        });
      }
    });
  }
}
