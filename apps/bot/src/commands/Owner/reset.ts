import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Command.Options>({
  name: 'reset',
  description: 'Reset RPG data (owner only)',
  preconditions: ['OwnerOnly'],
  fullCategory: ['Owner'],
})
export class ResetCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(
        b
          .setName(this.name)
          .setDescription(this.container.i18n.t('commands/descriptions:reset'))
          .addStringOption((o) =>
            o
              .setName('target')
              .setDescription(this.container.i18n.t('commands/reset:option_desc'))
              .setRequired(true)
              .addChoices(
                { name: this.container.i18n.t('commands/reset:choice_items'), value: 'items' },
                { name: this.container.i18n.t('commands/reset:choice_users'), value: 'users' },
                { name: this.container.i18n.t('commands/reset:choice_all'), value: 'all' },
              ),
          )
          .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
        'commands/names:reset',
        'commands/descriptions:reset',
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const target = interaction.options.getString('target', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target === 'items') {
      await this.container.db.item.deleteMany({});
      return interaction.editReply(
        t('commands/reset:done_items', { defaultValue: '✅ Collection `items` deleted.' }),
      );
    }
    if (target === 'users') {
      await this.container.db.user.deleteOne({ discordId: interaction.user.id });
      return interaction.editReply(
        t('commands/reset:done_users', { defaultValue: '✅ Collection `users` deleted.' }),
      );
    }

    if (target === 'all') {
      await this.container.db.user.deleteMany({});
      await this.container.db.item.deleteMany({});
      await this.container.db.dungeon.deleteMany({});
      return interaction.editReply(
        t('commands/reset:done_all', { defaultValue: '💥 ALL data wiped. Fresh start!' }),
      );
    }
  }
}
