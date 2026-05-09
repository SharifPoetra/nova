import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'daily',
  description: 'Ambil koin harianmu (1000 koin)!',
  fullCategory: ['Economy'],
})
export class DailyCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    // 1. Defer reply untuk mencegah timeout jika database sedang sibuk
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userId = interaction.user.id;
    const rewardAmount = 1000;
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 jam
    const now = new Date();

    try {
      // 2. Ambil data user atau buat baru jika belum ada (Atomic Upsert)
      const userData = await this.container.db.user.findOneAndUpdate(
        { discordId: userId },
        { $setOnInsert: { discordId: userId } },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      );

      const lastDaily = userData.lastDaily ? new Date(userData.lastDaily).getTime() : 0;

      // 3. Cek Cooldown
      if (now.getTime() - lastDaily < cooldownMs) {
        const remaining = cooldownMs - (now.getTime() - lastDaily);
        const hours = Math.floor(remaining / (60 * 60 * 1000));
        const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

        return interaction.editReply({
          content: `⏳ Sabar ya! Kamu bisa ambil daily lagi dalam **${hours} jam ${minutes} menit**.`,
        });
      }

      // 4. Update Saldo dan Timestamp (Atomic Update)
      await this.container.db.user.updateOne(
        { discordId: userId },
        {
          $inc: { balance: rewardAmount, stamina: 20 },
          $set: { lastDaily: now },
        },
      );

      return interaction.editReply({
        content: `💰 **Daily Reward Berhasil!**\nKamu mendapatkan **${rewardAmount.toLocaleString('id-ID')} koin**.\nSaldo sekarang: **${(userData.balance + rewardAmount).toLocaleString('id-ID')} koin**.`,
      });
    } catch (error) {
      this.container.logger.error(error);
      return interaction.editReply({
        content: '❌ Terjadi kesalahan saat memproses reward harianmu.',
      });
    }
  }
}
