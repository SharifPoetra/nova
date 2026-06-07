import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, type InteractionHandlerError } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Listener.Options>({
  event: Events.InteractionHandlerError,
  name: 'interactionHandlerError',
})
export class InteractionHandlerErrorListener extends Listener {
  public override async run(error: Error, { interaction, handler }: InteractionHandlerError) {
    const t = await fetchT(interaction);
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();

    this.container.logger.error(
      `[${id}] ${handler.name} failed — ${interaction.user.tag} @ ${interaction.guild?.name ?? 'DM'}`,
      error,
    );
    this.container.logger.debug(error.stack);

    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle(t('common:error.handler_failed_title'))
      .setDescription(t('common:error.handler_failed_desc', { handler: handler.name, id }))
      .setFooter({ text: t('common:error.handler_failed_footer') })
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
        this.container.logger.info(`[${id}] Rollback class selection untuk ${interaction.user.tag}`);
      } catch (e) {
        this.container.logger.error(`[${id}] Rollback class gagal`, e as Error);
      }
    }
  }
}
