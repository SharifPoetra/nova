import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  StringSelectMenuInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class HelpSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.customId === 'help_select' ? this.some() : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction) {
    const cmd = this.container.stores.get('commands').get(interaction.values[0]);
    const embed = new EmbedBuilder()
      .setTitle(`/${cmd.name}`)
      .setDescription(cmd.description)
      .addFields({ name: 'Kategori', value: cmd.fullCategory[0] || 'general', inline: true })
      .setColor(0x5865f2);

    const back = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('help_back')
        .setLabel('← Kembali')
        .setStyle(ButtonStyle.Secondary),
    );

    await interaction.update({ embeds: [embed], components: [back] });
  }
}
