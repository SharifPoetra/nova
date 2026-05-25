import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
  ButtonInteraction,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
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

    const isDungeon = interaction.message.components?.some(
      (row: any) =>
        'components' in row && row.components?.some((c: any) => c.customId === 'closebag'),
    );

    const renderUser = {
      ...user.toObject(),
      discordId: userId,
      username: interaction.user.username,
      avatar: interaction.user.displayAvatarURL(),
    };

    let { embed, components } = await renderConsumablePage(this.container, renderUser, page, t);

    if (isDungeon) {
      components = components
        .map((row) => {
          const r = ActionRowBuilder.from(row as any);
          r.setComponents(
            r.components.filter((b: any) => {
              const id = b.data?.custom_id ?? b.data?.customId ?? '';
              return !id.startsWith('inv_back_');
            }),
          );
          return r;
        })
        .filter((r) => r.components.length > 0);

      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('closebag')
          .setLabel(t('commands/dungeon:close_bag', { defaultValue: '🎒 Close Bag' }))
          .setStyle(ButtonStyle.Secondary),
      );
      components = [...components, closeRow] as any;
      embed.setColor(0x2ecc71);
    }

    this.container.invCache?.set(interaction.message.id, {
      type: 'consumable',
      page,
      userId,
      t: Date.now(),
    });

    await interaction.editReply({ embeds: [embed], components });
  }
}
