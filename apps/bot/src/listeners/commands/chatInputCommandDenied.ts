import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events, type ChatInputCommandDeniedPayload, UserError } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Listener.Options>({ event: Events.ChatInputCommandDenied })
export class ChatInputCommandDeniedListener extends Listener {
  public override async run(error: UserError, { interaction }: ChatInputCommandDeniedPayload) {
    const t = await fetchT(interaction);

    if (error instanceof UserError && error.identifier === 'OwnerOnly') {
      const msg =
        error.message ||
        t('common:error.precondition_owner_only', { defaultValue: 'Only the owner can use this command.' });
      try {
        if (interaction.deferred || interaction.replied) await interaction.editReply({ content: `🚫 ${msg}` });
        else await interaction.reply({ content: `🚫 ${msg}`, flags: MessageFlags.Ephemeral });
      } catch {
        /* ignore */
      }
      return;
    }
  }
}
