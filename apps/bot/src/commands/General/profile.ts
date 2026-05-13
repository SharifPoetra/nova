import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs';
import { getClass } from '../../lib/rpg/classes';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { getExpNeeded } from '../../lib/rpg/leveling';
import { colorBar } from '../../lib/utils';

@ApplyOptions<Command.Options>({
  name: 'profile',
  description: 'Melihat profil lengkap Ekonomi dan RPG kamu di Nova',
  detailedDescription: {
    usage: '/profile [user:optional]',
    examples: ['/profile', '/profile user:@Kaito'],
    extendedHelp: `
Lihat semua statistik karakter kamu atau orang lain.

**Yang ditampilkan:**
- 💰 Ekonomi: dompet, bank, total item
- 📊 RPG: level, EXP bar, HP, stamina, attack
- ✨ Buff aktif dengan sisa waktu
- ⏱️ Cooldown /explore, /fish, /hunt
- 📅 Tanggal bergabung

**Fitur khusus:**
- Regen pasif otomatis saat cek profil sendiri
- Lihat profil orang lain tanpa mengganggu data mereka
- Warna embed sesuai class
- Footer menampilkan milestone hunt

Gunakan untuk cek kesiapan sebelum hunt atau pamer build ke teman.
    `.trim(),
  },
  fullCategory: ['General'],
})
export class ProfileCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption((o) =>
          o.setName('user').setDescription('User yang ingin dilihat profilnya').setRequired(false),
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
              ? '❌ Kamu belum terdaftar di Nova Chronicles!\nGunakan `/start` untuk memulai petualangan.'
              : `❌ **${target.username}** belum memulai petualangan.`,
          );
        return interaction.editReply({ embeds: [embed] });
      }

      const isSelf = target.id === interaction.user.id;
      if (isSelf) {
        applyPassiveRegen(userData);
        await userData.save();
      } else {
        userData.buffs = (userData.buffs || []).filter((b) => new Date(b.expires) > new Date());
      }

      const now = Date.now();
      const hp = userData.hp ?? 100;
      const maxHp = userData.maxHp ?? 100;
      const stamina = userData.stamina ?? 100;
      const maxStamina = userData.maxStamina ?? 100;
      const level = userData.level ?? 1;
      const exp = userData.exp ?? 0;
      const expNeeded = getExpNeeded(level);
      const expNext = expNeeded - exp;
      const balance = userData.balance ?? 0;
      const bank = userData.bank ?? 0;
      const itemCount = userData.items?.reduce((a, b) => a + b.qty, 0) || 0;
      const classData = getClass(userData.class);
      const color = classData?.color ?? 0x3498db;
      const classEmoji = classData?.emoji ?? '👤';
      const className = classData?.name ?? 'Petualang Baru';

      const bonusAtk = getAtkBuff(userData);
      const activeBuffs = (userData.buffs || []).filter((b) => new Date(b.expires) > new Date());

      const buffText = activeBuffs.length
        ? activeBuffs
            .map((b) => {
              const mins = Math.max(0, Math.ceil((new Date(b.expires).getTime() - now) / 60000));
              const icon = b.type === 'atk' ? '⚔️' : b.type === 'stamina_regen' ? '⚡' : '✨';
              const label =
                b.type === 'atk' ? 'ATK' : b.type === 'stamina_regen' ? 'Regen' : b.type;
              return `${icon} ${label} +${b.value} (${mins}m)`;
            })
            .join('\n')
        : 'Tidak ada';

      const atkDisplay =
        bonusAtk > 0
          ? `**${userData.attack ?? 10}** (+${bonusAtk}) 🔥`
          : `**${userData.attack ?? 10}**`;

      const nextUnlock = BASE_MONSTERS.filter((m) => m.minLevel > level).sort(
        (a, b) => a.minLevel - b.minLevel,
      )[0];

      const footerText = nextUnlock
        ? `🎯 ${nextUnlock.name} terbuka di Lv.${nextUnlock.minLevel} • ${expNext} EXP lagi`
        : '🏆 Semua monster terbuka! Kamu legenda Nova';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `Nova Chronicles — ${target.username}`,
          iconURL: target.displayAvatarURL(),
        })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setColor(color)
        .setDescription(`*“Setiap langkah di Menara Nova menulis takdir.”*`)
        .addFields(
          { name: '💰 Dompet', value: `**${balance.toLocaleString('id-ID')}**`, inline: true },
          { name: '🏦 Bank', value: `**${bank.toLocaleString('id-ID')}**`, inline: true },
          { name: '🎒 Inventory', value: `${itemCount} item`, inline: true },
          {
            name: `${classEmoji} ${className} — Lv.${level}`,
            value: `${colorBar(exp, expNeeded, 10, '🟦', '⬜')} \`${exp}/${expNeeded} EXP\` • **${expNext} lagi**`,
            inline: false,
          },
          {
            name: '❤️ Vitalitas',
            value: `${colorBar(hp, maxHp, 10, '🟥', '⬛')} \`${hp}/${maxHp}\``,
            inline: true,
          },
          {
            name: '⚡ Stamina',
            value: `${colorBar(stamina, maxStamina, 10, '🟨', '⬛')} \`${stamina}/${maxStamina}\``,
            inline: true,
          },
          { name: '🗡️ Attack', value: atkDisplay, inline: true },
          { name: '✨ Buff Aktif', value: buffText, inline: false },
          {
            name: '📅 Bergabung',
            value: `<t:${Math.floor(new Date(userData.createdAt).getTime() / 1000)}:D>`,
            inline: true,
          },
        )
        .setFooter({ text: footerText });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply('❌ Terjadi kesalahan saat mengambil data.');
    }
  }
}
