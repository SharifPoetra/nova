import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Command.Options>({
  name: 'lang',
  description: 'Ganti bahasa',
})
export class LangCommand extends Command {
  public override registerApplicationCommands(r: Command.Registry) {
    r.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('pilih')
            .setDescription('Bahasa')
            .setRequired(true)
            .addChoices(
              { name: 'Indonesia', value: 'id' },
              { name: 'English', value: 'en' },
              { name: 'Melayu', value: 'ms' },
              { name: 'Reset', value: 'reset' },
            ),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const choice = interaction.options.getString('pilih', true);
    const t = await fetchT(interaction);

    if (choice === 'reset') {
      await this.container.db.user.updateOne(
        { discordId: interaction.user.id },
        { $set: { lang: null } },
      );
      return interaction.editReply(t('commands/lang:lang_reset'));
    }

    await this.container.db.user.updateOne(
      { discordId: interaction.user.id },
      { $set: { lang: choice } },
      { upsert: true },
    );
    return interaction.editReply(t('commands/lang:lang_changed', { lang: choice }));
  }
}
