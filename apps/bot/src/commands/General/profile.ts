import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { User } from '@nova/db';

@ApplyOptions<Command.Options>({
  name: 'profile',
  description: 'Melihat profil lengkap Ekonomi dan RPG kamu di Nova',
  fullCategory: ['General'],
})
export class ProfileCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
       .setName(this.name)
       .setDescription(this.description)
       .addUserOption((option) =>
          option.setName('user').setDescription('User yang ingin dilihat profilnya').setRequired(false)
        )
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user')?? interaction.user;
    await interaction.deferReply();

    try {
      const userData = await User.findOneAndUpdate(
        { discordId: target.id },
        { $setOnInsert: { discordId: target.id, username: target.username } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      ).lean();

      if (!userData) throw new Error('User not found');

      let classEmoji = '👤';
      if (userData.class === 'warrior') classEmoji = '⚔️';
      if (userData.class === 'mage') classEmoji = '🪄';
      if (userData.class === 'rogue') classEmoji = '🏹';

      const bar = (current: number, max: number) => {
  const len = 10;
  const safeCurrent = Math.max(0, current ?? 0);
  const safeMax = Math.max(1, max ?? 1); // hindari bagi 0
  const ratio = Math.min(1, safeCurrent / safeMax);
  const filled = Math.round(ratio * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
};

      const hp = userData.hp ?? 100;
const maxHp = userData.maxHp ?? 100;
const stamina = userData.stamina ?? 100;
const maxStamina = userData.maxStamina ?? 100;

const hpBar = bar(hp, maxHp);
const staBar = bar(stamina, maxStamina);

      const embed = new EmbedBuilder()
       .setAuthor({ name: `Profil ${target.username}`, iconURL: target.displayAvatarURL() })
       .setThumbnail(target.displayAvatarURL({ size: 256 }))
       .setColor(userData.class? 0xFFD700 : 0x5865F2)
       .addFields(
          {
            name: '💳 Ekonomi',
            value: `> 💰 **Saldo:** ${userData.balance.toLocaleString('id-ID')} koin\n> 📅 **Bergabung:** ${new Date(userData.createdAt).toLocaleDateString('id-ID')}`,
            inline: false,
          },
          {
            name: `${classEmoji} RPG Status`,
            value:
              `> 🏆 **Class:** ${userData.class? userData.class.charAt(0).toUpperCase() + userData.class.slice(1) : '*Belum memilih - /class*'}\n` +
              `> 🌟 **Level:** ${userData.level}\n` +
              `> 📈 **EXP:** ${userData.exp.toLocaleString('id-ID')} / ${userData.level * 100}\n` +
              `> ❤️ **HP:** ${hpBar} \`${hp}/${maxHp}\`\n` +
              `> ⚡ **Stamina:** ${staBar} \`${stamina}/${maxStamina}\``,
            inline: false,
          },
          {
            name: '⚔️ Statistik Tempur',
            value: `> 🗡️ **Attack:** ${userData.attack}`,
            inline: true,
          }
        )
       .setFooter({ text: 'Nova Chronicles • Petualangan Dimulai Dari Sini' })
       .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply('❌ Terjadi kesalahan saat mengambil data dari database.');
    }
  }
}
