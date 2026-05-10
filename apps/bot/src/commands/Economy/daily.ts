import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'daily',
  description: 'Ambil koin harianmu (1000 koin)!',
  detailedDescription: {
    usage: '/daily',
    examples: ['/daily'],
    extendedHelp: `
Klaim reward harian setiap 24 jam.

**Hadiah:**
- +1.000 koin
- +20 stamina

**Aturan:**
- Wajib /start dulu
- Cooldown 24 jam
- Stamina tidak akan melebihi max

Gunakan untuk farming konsisten sebelum /hunt atau /explore.
    `.trim(),
  },
  fullCategory: ['Economy'],
})
export class DailyCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const reward = 1000;
    const staminaBonus = 20;
    const cd = 24 * 60 * 60 * 1000;
    const now = new Date();

    try {
      const user = await this.container.db.user.findOne({ discordId: interaction.user.id });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle('❌ Belum Terdaftar')
          .setDescription('Gunakan `/start` dulu untuk membuat karakter sebelum klaim daily.');
        return interaction.editReply({ embeds: [embed] });
      }

      const last = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;

      if (now.getTime() - last < cd) {
        const remain = cd - (now.getTime() - last);
        const h = Math.floor(remain / 3600000);
        const m = Math.floor((remain % 3600000) / 60000);

        const embed = new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle('⏳ Daily Cooldown')
          .setDescription(`Kamu sudah klaim hari ini.\nCoba lagi dalam **${h}j ${m}m**.`)
          .setFooter({ text: 'Reset setiap 24 jam' });

        return interaction.editReply({ embeds: [embed] });
      }

      const newStamina = Math.min(user.stamina + staminaBonus, user.maxStamina);
      const actualStaminaGain = newStamina - user.stamina;

      await this.container.db.user.updateOne(
        { discordId: interaction.user.id },
        {
          $inc: { balance: reward },
          $set: { lastDaily: now, stamina: newStamina },
        },
      );

      const newBalance = user.balance + reward;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle('💰 Daily Reward')
        .setDescription('Reward harian berhasil diklaim!')
        .addFields(
          { name: 'Koin', value: `+${reward.toLocaleString('id-ID')}`, inline: true },
          { name: 'Stamina', value: `+${actualStaminaGain}`, inline: true },
          { name: 'Saldo Baru', value: `${newBalance.toLocaleString('id-ID')} koin`, inline: true },
        )
        .setFooter({ text: `Stamina: ${newStamina}/${user.maxStamina} • Kembali besok` })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (e) {
      this.container.logger.error(e);
      const err = new EmbedBuilder().setColor(0xe74c3c).setDescription('❌ Gagal memproses daily.');
      return interaction.editReply({ embeds: [err] });
    }
  }
}
