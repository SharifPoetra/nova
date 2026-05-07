import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

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
      const userData = await this.container.db.user.findOne({ discordId: target.id });

      if (!userData) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
          .setDescription(
            target.id === interaction.user.id
              ? '❌ Kamu belum terdaftar di Nova Chronicles!\nGunakan `/start` untuk memulai petualangan dan dapatkan 1.000 koin awal.'
              : `❌ **${target.username}** belum memulai petualangan.`,
          );
        return interaction.editReply({ embeds: [embed] });
      }

      const bar = (current: number, max: number) => {
        const len = 10;
        const safeMax = Math.max(1, max ?? 1);
        const ratio = Math.min(1, Math.max(0, (current ?? 0) / safeMax));
        const filled = Math.round(ratio * len);
        return '▰'.repeat(filled) + '▱'.repeat(len - filled);
      };

      const hp = userData.hp ?? 100;
      const maxHp = userData.maxHp ?? 100;
      const stamina = userData.stamina ?? 100;
      const maxStamina = userData.maxStamina ?? 100;
      const level = userData.level ?? 1;
      const exp = userData.exp ?? 0;
      const expNeeded = level * 100;
      const balance = userData.balance ?? 0;
      const bank = userData.bank ?? 0;

      const now = Date.now();
      const cooldown = 60 * 1000;
      const nextExplore = userData.lastExplore ? userData.lastExplore.getTime() + cooldown : 0;
      const exploreStatus =
        nextExplore > now ? `<t:${Math.floor(nextExplore / 1000)}:R>` : '✅ Siap';

      const itemCount = userData.items?.reduce((a, b) => a + b.qty, 0) || 0;

      const classColors: Record<string, number> = {
        warrior: 0xc41e3a,
        mage: 0x7b68ee,
        rogue: 0x2ecc71,
      };
      const color = classColors[userData.class as string] ?? 0x3498db;

      let classEmoji = '👤';
      let className = 'Petualang Baru';
      if (userData.class === 'warrior') {
        classEmoji = '⚔️';
        className = 'Warrior';
      }
      if (userData.class === 'mage') {
        classEmoji = '🪄';
        className = 'Mage';
      }
      if (userData.class === 'rogue') {
        classEmoji = '🏹';
        className = 'Rogue';
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Nova Chronicles — ${target.username}`,
          iconURL: target.displayAvatarURL(),
        })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setColor(color)
        .setDescription(`*“Setiap langkah di Menara Nova menulis takdir.”*`)
        .addFields(
          { name: '💰 Dompet', value: `**${balance.toLocaleString('id-ID')}** koin`, inline: true },
          { name: '🏦 Bank', value: `**${bank.toLocaleString('id-ID')}** koin`, inline: true },
          { name: '🎒 Inventory', value: `${itemCount} item`, inline: true },
          {
            name: `${classEmoji} ${className} — Lv.${level}`,
            value: `${bar(exp, expNeeded)} \`${exp}/${expNeeded} EXP\``,
            inline: false,
          },
          { name: '❤️ Vitalitas', value: `${bar(hp, maxHp)} \`${hp}/${maxHp}\``, inline: true },
          {
            name: '⚡ Stamina',
            value: `${bar(stamina, maxStamina)} \`${stamina}/${maxStamina}\``,
            inline: true,
          },
          { name: '🗺️ Explore', value: exploreStatus, inline: true },
          {
            name: '📅 Bergabung',
            value: `<t:${Math.floor(new Date(userData.createdAt).getTime() / 1000)}:D>`,
            inline: true,
          },
          { name: '🗡️ Attack', value: `**${userData.attack ?? 10}**`, inline: true },
        )
        .setFooter({ text: 'Gunakan /explore untuk menguji kekuatanmu' });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply('❌ Terjadi kesalahan saat mengambil data.');
    }
  }
}
