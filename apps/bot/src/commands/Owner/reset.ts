import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'reset',
  description: 'Reset data RPG (owner only)',
  detailedDescription: {
    usage: '/reset target:<items|me|all>',
    examples: ['/reset target:items', '/reset target:me'],
    extendedHelp: `
Maintenance khusus Owner.

**Target:**
• items — hapus collection items
• users — hapus collection users
• all — WIPE TOTAL semua user (DANGER!)

Butuh permission OwnerOnly.
Jalankan 'items' setelah update /fish atau /hunt.
`.trim(),
  },
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
              { name: 'Hapus collection items', value: 'items' },
              { name: 'Hapus collection users', value: 'users' },
              { name: 'ALL DATA (bahaya!)', value: 'all' },
            ),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getString('target', true);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (target === 'items') {
      await this.container.db.item.deleteMany({});
      return interaction.editReply('✅ Collection `items` dihapus.');
    }
    if (target === 'users') {
      await this.container.db.user.deleteOne({ discordId: interaction.user.id });
      return interaction.editReply('✅ Collection `users` dihapus.');
    }

    if (target === 'all') {
      await this.container.db.user.deleteMany({});
      await this.container.db.item.deleteMany({});
      await this.container.db.dungeon.deleteMany({});
      return interaction.editReply('💥 SEMUA data diwipe. Fresh start!');
    }
  }
}
