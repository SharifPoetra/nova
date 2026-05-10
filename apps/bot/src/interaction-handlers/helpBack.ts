import { Command, InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import type { HelpCommand } from '../commands/General/help';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class HelpBackHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.isButton() && interaction.customId.startsWith('help_back_')
      ? this.some()
      : this.none();
  }

  public async run(interaction: ButtonInteraction) {
    const ownerId = interaction.customId.split('_')[2];
    if (interaction.user.id !== ownerId) return;
    const helpCmd = this.container.stores.get('commands').get('help') as HelpCommand;
    const all = [...this.container.stores.get('commands').values()] as Command[];
    const usable: Command[] = [];
    for (const cmd of all) {
      if (cmd.name === 'help') continue;
      const perms = (cmd.options as any).requiredUserPermissions;
      if (!perms?.length) usable.push(cmd);
      else if (interaction.memberPermissions?.has(perms)) usable.push(cmd);
    }

    const embed = helpCmd.buildMainEmbed(usable);
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`help_select_${ownerId}`)
        .setPlaceholder('Pilih command')
        .addOptions(
          usable.slice(0, 25).map((c: any) => ({
            label: `/${c.name}`,
            description: c.description.slice(0, 100),
            value: c.name,
          })),
        ),
    );
    await interaction.update({ embeds: [embed], components: [menu] });
  }
}
