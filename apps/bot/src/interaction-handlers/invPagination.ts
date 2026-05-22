import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ButtonInteraction, MessageFlags } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { renderInventoryPage } from '../lib/rpg/inventory';
import { fetchT } from '@sapphire/plugin-i18next';

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
    const t = await fetchT(interaction);
    const [, dir, pageStr, userId] = interaction.customId.split('_');
    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not your inventory!' }),
        flags: MessageFlags.Ephemeral,
      });

    await interaction.deferUpdate();
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);
    await user.save(); // ← penting, biar stamina update

    let page = Number.parseInt(pageStr, 10);
    page = dir === 'next' ? page + 1 : page - 1;

    // JANGAN pakai message.id untuk cache kalau mau rebuild consumables dengan locale baru
    // pass undefined biar renderInventoryPage query fresh
    const { embed, components, allItems, totalValue } = await renderInventoryPage(
      this.container,
      {
        ...user.toObject(),
        discordId: userId,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
      },
      page,
      t,
      undefined, // jangan pakai cache lama
    );

    // localize ulang embed
    embed
      .setAuthor({
        name: t('commands/inventory:author', {
          username: interaction.user.username,
          defaultValue: `${interaction.user.username}'s Inventory`,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setFooter({
        text: t('commands/inventory:footer', {
          total: totalValue.toLocaleString(interaction.locale),
          page: page + 1,
          totalPages: Math.max(1, Math.ceil(allItems.length / 10)),
          defaultValue: `Total value: ${totalValue.toLocaleString()} coins | Page ${page + 1}/${Math.ceil(allItems.length / 10)}`,
        }),
      });

    await interaction.editReply({ embeds: [embed], components });

    // update cache dengan data baru
    this.container.invCache?.set(interaction.message.id, {
      allItems,
      totalValue,
      userId,
      t: Date.now(),
      locale: interaction.locale,
    });
  }
}
