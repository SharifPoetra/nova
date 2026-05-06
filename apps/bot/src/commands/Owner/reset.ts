import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'reset',
  description: 'Reset data RPG (owner only)',
  preconditions: ['OwnerOnly'],
  fullCategory: ['Owner'],
})
export class ResetCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('target')
            .setDescription('apa yang direset')
            .setRequired(true)
            .addChoices(
              { name: 'items (perbaiki rarity)', value: 'items' },
              { name: 'my data', value: 'me' },
              { name: 'ALL USERS (bahaya!)', value: 'all' },
            ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getString('target', true);
    await interaction.deferReply({ ephemeral: true });

    if (target === 'items') {
      await this.container.db.item.deleteMany({});
      return interaction.editReply(
        '✅ Collection `items` dihapus. `/fish` sekali untuk rebuild dengan rarity baru.',
      );
    }

    if (target === 'me') {
      await this.container.db.user.deleteOne({ discordId: interaction.user.id });
      return interaction.editReply('✅ Data kamu dihapus. Gunakan `/start` lagi.');
    }

    if (target === 'all') {
      await this.container.db.user.deleteMany({});
      await this.container.db.item.deleteMany({});
      return interaction.editReply('💥 SEMUA data diwipe. Fresh start!');
    }
  }
}
