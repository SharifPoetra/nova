import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, InteractionHandlerError } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Listener.Options>({
  event: Events.InteractionHandlerError,
  name: 'interactionHandlerError',
})
export class InteractionHandlerErrorListener extends Listener {
  public override async run(error: Error, { interaction, handler }: InteractionHandlerError) {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();

    this.container.logger.error(
      `[${id}] ${handler.name} failed — ${interaction.user.tag} @ ${interaction.guild?.name ?? 'DM'}`,
      error,
    );
    this.container.logger.debug(error.stack);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle('❌ Terjadi Error')
      .setDescription(`Handler \`${handler.name}\` gagal dijalankan.\n\n**Error ID:** \`${id}\``)
      .setFooter({ text: 'Laporkan ID ini ke developer' })
      .setTimestamp();

    try {
      if (interaction.isRepliable()) {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ embeds: [embed], components: [] });
        } else {
          await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
      }
    } catch {
      this.container.logger.warn(`[${id}] Gagal kirim error reply`);
    }

    // Rollback khusus class select (kalau user klik tapi DB belum kesimpan)
    if (handler.name === 'ClassSelectHandler') {
      try {
        await this.container.db.user.deleteOne({
          discordId: interaction.user.id,
          class: { $exists: false },
          createdAt: { $gte: new Date(Date.now() - 60000) }, // cuma hapus yang dibuat <1 menit lalu
        });
        this.container.logger.info(
          `[${id}] Rollback class selection untuk ${interaction.user.tag}`,
        );
      } catch (e) {
        this.container.logger.error(`[${id}] Rollback class gagal`, e as Error);
      }
    }
  }
}
