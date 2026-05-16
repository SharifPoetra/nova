import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';

import resetEn from '../../locales/en-US/commands/reset.json';
import resetId from '../../locales/id/commands/reset.json';

@ApplyOptions<Command.Options>({
  name: 'reset',
  description: 'Reset RPG data (owner only)',
  preconditions: ['OwnerOnly'],
  fullCategory: ['Owner'],
})
export class ResetCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:reset', 'commands/descriptions:reset')
        .addStringOption((o) =>
          o
            .setName('target')
            .setDescription(resetEn.option_desc)
            .setDescriptionLocalizations({ id: resetId.option_desc, 'en-US': resetEn.option_desc })
            .setRequired(true)
            .addChoices(
              {
                name: resetEn.choice_items,
                value: 'items',
                name_localizations: { id: resetId.choice_items },
              },
              {
                name: resetEn.choice_users,
                value: 'users',
                name_localizations: { id: resetId.choice_users },
              },
              {
                name: resetEn.choice_all,
                value: 'all',
                name_localizations: { id: resetId.choice_all },
              },
            ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const target = interaction.options.getString('target', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target === 'items') {
      await this.container.db.item.deleteMany({});
      return interaction.editReply(t('commands/reset:done_items'));
    }
    if (target === 'users') {
      await this.container.db.user.deleteOne({ discordId: interaction.user.id });
      return interaction.editReply(t('commands/reset:done_users'));
    }
    if (target === 'all') {
      await this.container.db.user.deleteMany({});
      await this.container.db.item.deleteMany({});
      await this.container.db.dungeon.deleteMany({});
      return interaction.editReply(t('commands/reset:done_all'));
    }
  }
}
