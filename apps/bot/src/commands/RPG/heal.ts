import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'heal',
  description: 'Gunakan koin untuk memulihkan HP kamu',
  fullCategory: ['RPG'],
})
export class HealCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const userId = interaction.user.id;
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ id: userId });

    if (!user || !user.rpgClass) {
      return interaction.editReply({
        content: '❌ Kamu belum punya karakter! Gunakan `/start` dulu.',
      });
    }

    if (user.hp >= user.maxHp) {
      return interaction.editReply({
        content: '❤️ HP kamu sudah penuh, tidak perlu di-heal!',
      });
    }

    const healCost = 150; // Harga sekali heal
    const healAmount = 50; // Jumlah HP yang dipulihkan

    if (user.balance < healCost) {
      return interaction.editReply({
        content: `❌ Koin kamu tidak cukup! Butuh **${healCost}** koin untuk heal.`,
      });
    }

    // Hitung HP baru agar tidak melebihi Max HP
    const newHp = Math.min(user.maxHp, user.hp + healAmount);

    await this.container.db.user.updateOne(
      { id: userId },
      {
        $set: { hp: newHp },
        $inc: { balance: -healCost },
      },
    );

    const embed = new EmbedBuilder()
      .setTitle('🧪 Alchemist Shop')
      .setDescription(`Kamu membeli ramuan penyembuh seharga **${healCost}** koin.`)
      .addFields({ name: '❤️ HP Sekarang', value: `**${newHp}** / ${user.maxHp}` })
      .setColor('Green')
      .setFooter({ text: 'Nyawa kamu pulih, siap berpetualang lagi!' });

    return interaction.editReply({ embeds: [embed] });
  }
}
