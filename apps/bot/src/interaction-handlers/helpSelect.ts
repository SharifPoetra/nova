import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  StringSelectMenuInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import type { HelpCommand } from '../commands/General/help';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class HelpSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.customId === 'help_select' ? this.some() : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction) {
    // 1. ambil nama command dari dropdown
    const cmdName = interaction.values[0];
    const cmd = this.container.stores.get('commands').get(cmdName);

    if (!cmd) {
      return interaction.update({
        content: '❌ Command tidak ditemukan',
        embeds: [],
        components: [],
      });
    }

    // 2. ambil help command
    const helpCmd = this.container.stores.get('commands').get('help') as HelpCommand;
    const embed = helpCmd.getCommandDetail(cmd);

    const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('help_back')
        .setLabel('← Kembali')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [back] });
  }
}
