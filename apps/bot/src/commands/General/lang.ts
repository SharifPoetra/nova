import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { invalidateLangCache } from '../../index.ts';
import { getPermName } from '../../lib/utils.ts';

@ApplyOptions<Command.Options>({
  name: 'lang',
  description: 'Change language',
})
export class LangCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:lang', 'commands/descriptions:lang')
        .addStringOption((opt) => {
          return applyLocalizedBuilder(opt, 'commands/lang:option_name', 'commands/lang:option_desc')
            .setRequired(true)
            .addChoices({ name: 'Bahasa Indonesia', value: 'id' }, { name: 'English', value: 'en-US' });
        })
        .addBooleanOption((opt) => {
          opt.setName('guild').setNameLocalizations({ id: 'guild', 'en-US': 'guild' });
          return applyLocalizedBuilder(opt, 'commands/lang:guild_name', 'commands/lang:guild_desc');
        }),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const t = await fetchT(interaction);
    const lang = interaction.options.getString('language', true) as 'id' | 'en-US';
    const isGuild = interaction.options.getBoolean('guild') ?? false;

    if (isGuild && interaction.guildId) {
      const permNeeded = PermissionFlagsBits.ManageGuild;
      if (!interaction.memberPermissions?.has(permNeeded)) {
        return interaction.editReply(t('common:error.no_perm', { perm: getPermName(permNeeded) }));
      }
      await this.container.db.guild.updateOne({ guildId: interaction.guildId }, { $set: { lang } }, { upsert: true });
      invalidateLangCache(undefined, interaction.guildId);
    } else {
      await this.container.db.user.updateOne({ discordId: interaction.user.id }, { $set: { lang } }, { upsert: true });
      invalidateLangCache(interaction.user.id, undefined);
    }

    return interaction.editReply(t('commands/lang:lang_changed', { lang }));
  }
}
