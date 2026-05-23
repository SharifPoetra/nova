import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { renderConsumablePage } from '../lib/rpg/inventory';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions({
  name: 'invConsumable',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvConsumableHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_consumable_view_') ? this.some() : this.none();
  }

  public override async run(interaction: ButtonInteraction) {
    const t = await fetchT(interaction);

    const [, , , userId, pageStr] = interaction.customId.split('_');
    const page = Number(pageStr) || 0;

    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('errors:not_your_inventory', { defaultValue: 'Not your inventory!' }),
        flags: MessageFlags.Ephemeral,
      });

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;

    applyPassiveRegen(user);
    await user.save();

    const renderUser = {
      ...user.toObject(),
      discordId: userId,
      username: interaction.user.username,
      avatar: interaction.user.displayAvatarURL(),
    };

    const { embed, components } = await renderConsumablePage(this.container, renderUser, page, t);

    this.container.invCache?.set(interaction.message.id, {
      type: 'consumable',
      page,
      userId,
      t: Date.now(),
    });

    await interaction.editReply({ embeds: [embed], components });
  }
}
