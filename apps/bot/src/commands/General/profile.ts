import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { generateProfileCard } from '../../lib/images/profileCard';

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
          option
            .setName('user')
            .setDescription('User yang ingin dilihat profilnya')
            .setRequired(false),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') ?? interaction.user;

    await interaction.deferReply();

    try {
      const userData = await this.container.db.user.findOneAndUpdate(
        { id: target.id },
        { $setOnInsert: { id: target.id } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      // Tentukan emoji berdasarkan class (jika ada)
      let classEmoji = '👤';
      if (userData.rpgClass === 'Warrior') classEmoji = '⚔️';
      if (userData.rpgClass === 'Mage') classEmoji = '🪄';
      if (userData.rpgClass === 'Rogue') classEmoji = '🏹';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Profil ${target.username}`,
          iconURL: target.displayAvatarURL(),
        })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setColor(userData.rpgClass ? 'Gold' : 'Blue') // Warna emas jika sudah pilih class
        .addFields(
          {
            name: '💳 Ekonomi',
            value:
              `> 💰 **Saldo:** ${userData.balance.toLocaleString('id-ID')} koin\n` +
              `> 📅 **Bergabung:** ${userData.createdAt.toLocaleDateString('id-ID')}`,
            inline: false,
          },
          {
            name: `${classEmoji} RPG Status`,
            value:
              `> 🏆 **Class:** ${userData.rpgClass ?? '*Belum memilih (Gunakan /start)*'}\n` +
              `> 🌟 **Level:** ${userData.level}\n` +
              `> 📈 **EXP:** ${userData.exp.toLocaleString('id-ID')}\n` +
              `> ❤️ **HP:** ${userData.hp} / ${userData.maxHp}`,
            inline: false,
          },
          {
            name: '⚔️ Statistik Tempur',
            value: `> 🗡️ **Attack:** ${userData.attack}`,
            inline: true,
          },
        )
        .setFooter({ text: 'Nova Chronicles • Petualangan Dimulai Dari Sini' })
        .setTimestamp();

      // return interaction.editReply({ embeds: [embed] });
      const avatarUrl = target.displayAvatarURL({ extension: 'png', size: 256 });
      const imageBuffer = await generateProfileCard(
        target.username,
        avatarUrl,
        userData.level,
        userData.rpgClass ?? 'Novice',
      );

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'profile.png' });

      // Kirim gambar sebagai attachment, embed-nya bisa kita simpan sebagai caption
      return interaction.editReply({
        files: [attachment],
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply('❌ Terjadi kesalahan saat mengambil data dari database.');
    }
  }
}
