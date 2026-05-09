import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { HelpCommand } from '../commands/General/help';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class HelpBackHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.customId === 'help_back' ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction) {
    const helpCmd = this.container.stores.get('commands').get('help') as HelpCommand;
    const all = [...this.container.stores.get('commands').values()];
    const usable = [];
    for (const cmd of all) {
      if (cmd.name === 'help') continue;
      try {
        const res = await this.container.stores.get('preconditions').run(interaction, cmd, {});
        if (res.isOk()) usable.push(cmd);
      } catch {
        usable.push(cmd);
      }
    }

    const embed = helpCmd.buildMainEmbed(usable);
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('Pilih command')
        .addOptions(
          usable.slice(0, 25).map((c) => ({
            label: `/${c.name}`,
            description: c.description.slice(0, 100),
            value: c.name,
          })),
        ),
    );

    await interaction.update({ embeds: [embed], components: [menu] });
  }
}
