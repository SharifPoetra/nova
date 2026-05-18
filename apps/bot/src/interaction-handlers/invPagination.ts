import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { renderInventoryPage } from '../lib/rpg/inventory-render';

@ApplyOptions<InteractionHandler.Options>({
  name: 'invPagination',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvPaginationHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_prev_') || i.customId?.startsWith('inv_next_')
      ? this.some()
      : this.none();
  }

  public override async run(interaction: ButtonInteraction) {
    const [, dir, pageStr, userId] = interaction.customId.split('_');
    if (interaction.user.id !== userId)
      return interaction.reply({ content: 'Not your inventory!', ephemeral: true });

    await interaction.deferUpdate();
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    let page = Number.parseInt(pageStr, 10);
    page = dir === 'next' ? page + 1 : page - 1;

    const { embed, components } = await renderInventoryPage(
      this.container,
      {
        ...user.toObject(),
        discordId: userId,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
      },
      page,
      interaction.message.id,
    );
    await interaction.editReply({ embeds: [embed], components });
  }
}
