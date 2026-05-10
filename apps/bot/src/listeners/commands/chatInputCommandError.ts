import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, type ChatInputCommandErrorPayload } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.ChatInputCommandError,
  name: 'chatInputCommandError',
})
export class ChatInputCommandErrorListener extends Listener {
  public override async run(error: Error, { interaction, command }: ChatInputCommandErrorPayload) {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();

    this.container.logger.error(
      `[${id}] /${command.name} failed — ${interaction.user.tag} @ ${interaction.guild?.name ?? 'DM'}`,
      error,
    );
    this.container.logger.debug(error.stack);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Terjadi Error')
      .setDescription(`Command \`/${command.name}\` gagal dijalankan.\n\n**Error ID:** \`${id}\``)
      .setFooter({ text: 'Laporkan ID ini ke developer' })
      .setTimestamp();

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [embed], content: null });
      } else {
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }
    } catch {
      this.container.logger.warn(`[${id}] Gagal kirim error reply`);
    }

    // Rollback RPG stamina
    if (['hunt', 'fish', 'cook'].includes(command.name)) {
      try {
        const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
        if (user && user.stamina < user.maxStamina) {
          user.stamina = Math.min(user.maxStamina, user.stamina + 20);
          await user.save();
          this.container.logger.info(`[${id}] Rollback +20 stamina untuk ${interaction.user.tag}`);
        }
      } catch (e) {
        this.container.logger.error(`[${id}] Rollback gagal`, e as Error);
      }
    }
  }
}
