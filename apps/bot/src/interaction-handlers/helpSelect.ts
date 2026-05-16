import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  StringSelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import type { HelpCommand } from '../commands/General/help';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class HelpSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.isStringSelectMenu() && interaction.customId.startsWith('help_select_')
      ? this.some()
      : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const ownerId = interaction.customId.split('_')[2];
    if (interaction.user.id !== ownerId)
      return interaction.reply({
        content: t('commands/help:not_yours', {
          defaultValue: "This is someone else's help menu 🙂",
        }),
        flags: MessageFlags.Ephemeral,
      });

    const cmd = this.container.stores.get('commands').get(interaction.values[0]);
    if (!cmd)
      return interaction.update({
        content: t('commands/help:not_found', { defaultValue: '❌ Command not found' }),
        embeds: [],
        components: [],
      });

    const helpCmd = this.container.stores.get('commands').get('help') as HelpCommand;
    const embed = await helpCmd.getCommandDetail(cmd, interaction);
    const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`help_back_${ownerId}`)
        .setLabel(t('commands/help:back', { defaultValue: '← Back' }))
        .setStyle(ButtonStyle.Secondary),
    );
    await interaction.update({ embeds: [embed], components: [back] });
  }
}
