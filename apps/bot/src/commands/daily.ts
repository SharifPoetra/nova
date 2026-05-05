import { Command } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { UserModel } from '@nova/db';

export class DailyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      description: 'Ambil koin harianmu (1000 koin)!',
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputInteraction) {
    const userId = interaction.user.id;
    const rewardAmount = 1000;
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 jam

    // 1. Cari user atau buat baru dengan findOneAndUpdate (lebih efisien/atomic)
    let user = await UserModel.findOne({ id: userId });

    if (!user) {
      user = await UserModel.create({ id: userId });
    }

    const now = new Date();
    const lastDaily = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;

    // 2. Cek apakah sudah lewat 24 jam
    if (now.getTime() - lastDaily < cooldownMs) {
      const remaining = cooldownMs - (now.getTime() - lastDaily);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      return interaction.reply({
        content: `⏳ Sabar ya! Kamu bisa ambil daily lagi dalam **${hours} jam ${minutes} menit**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // 3. Update saldo dan timestamp terakhir
    user.balance += rewardAmount;
    user.lastDaily = now;
    await user.save();

    return interaction.reply({
      content: `💰 **Daily Reward Berhasil!**\nKamu mendapatkan **${rewardAmount} koin**.\nSaldo sekarang: **${user.balance} koin**.`,
    });
  }
}
