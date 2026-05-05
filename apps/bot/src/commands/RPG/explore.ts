import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Jelajahi dungeon dan lawan monster untuk dapatkan EXP!',
  fullCategory: ['RPG'],
  cooldownDelay: 5000,
})
export class ExploreCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    // 1. Ambil data user
    const user = await this.container.db.user.findOne({ id: userId });

    if (!user || !user.rpgClass) {
      return interaction.editReply(
        '❌ Kamu harus memilih class dulu! Gunakan `/start` untuk memulai petualangan.',
      );
    }

    if (user.hp <= 0) {
      return interaction.editReply(
        '😵 Kamu terlalu lelah (HP 0). Istirahatlah dulu atau gunakan `/heal`!',
      );
    }

    // 2. Daftar Monster (Sederhana)
    const monsters = [
      { name: 'Slime Hijau', hp: 40, atk: 5, exp: 20, gold: 50, emoji: '🟢' },
      { name: 'Goblin Pencuri', hp: 60, atk: 10, exp: 45, gold: 120, emoji: '👺' },
      { name: 'Kelelawar Gua', hp: 30, atk: 8, exp: 25, gold: 60, emoji: '🦇' },
      { name: 'Skeleton Guard', hp: 100, atk: 15, exp: 100, gold: 300, emoji: '💀' },
    ];

    // Pilih monster secara acak
    const monster = monsters[Math.floor(Math.random() * monsters.length)];

    // 3. Simulasi Pertarungan (Looping sampai salah satu tumbang)
    let playerHp = user.hp;
    let monsterHp = monster.hp;
    let turn = 0;
    let log = `⚔️ Pertarungan sengit dimulai melawan **${monster.name}**!\n\n`;

    // Berhenti jika salah satu HP <= 0 atau sudah 5 ronde (biar gak spam panjang)
    while (playerHp > 0 && monsterHp > 0 && turn < 5) {
      turn++;

      // Player nyerang
      monsterHp -= user.attack;
      log += `🔹 **Ronde ${turn}:** Kamu hit **${user.attack}** damage. (Sisa HP Monster: ${Math.max(0, monsterHp)})\n`;

      if (monsterHp <= 0) break; // Monster mati, stop loop

      // Monster nyerang balik
      playerHp -= monster.atk;
      log += `🔸 **Ronde ${turn}:** Monster hit **${monster.atk}** damage. (Sisa HP Kamu: ${Math.max(0, playerHp)})\n`;
    }

    const isWin = monsterHp <= 0;
    const finalHp = Math.max(0, playerHp);

    // 4. Update Database
    if (isWin) {
      await this.container.db.user.updateOne(
        { id: userId },
        {
          $set: { hp: finalHp },
          $inc: { exp: monster.exp, balance: monster.gold },
        },
      );
    } else {
      await this.container.db.user.updateOne({ id: userId }, { $set: { hp: finalHp } });
    }

    // 5. Tampilan Embed
    const embed = new EmbedBuilder()
      .setTitle(`${monster.emoji} Dungeon Encounter: ${monster.name}`)
      .setDescription(log)
      .addFields({
        name: isWin ? '✅ Kemenangan!' : '🏃 Terpaksa Mundur...',
        value: isWin
          ? `Kamu mengalahkan monster!\n💰 +${monster.gold} koin\n🌟 +${monster.exp} EXP`
          : `Monster masih terlalu kuat. Kamu melarikan diri dengan sisa HP: **${finalHp}**.`,
      })
      .setColor(isWin ? 'Green' : 'Red')
      .setFooter({ text: `Sisa HP kamu: ${finalHp}` });

    return interaction.editReply({ embeds: [embed] });
  }
}
