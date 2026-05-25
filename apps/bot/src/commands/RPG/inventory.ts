import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  type AnyComponentBuilder,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import {
  renderInventoryPage,
  renderConsumablePage,
  renderEquipmentPage,
} from '../../lib/rpg/inventory';

@ApplyOptions<Command.Options>({
  name: 'inventory',
  description: 'View all your items',
  fullCategory: ['RPG'],
})
export class InventoryCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:inventory', 'commands/descriptions:inventory'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user)
      return interaction.editReply(
        t('common:need_start', { defaultValue: '❌ Use /start first!' }),
      );

    applyPassiveRegen(user);
    await user.save();

    if (!user.items?.length) {
      return interaction.editReply(
        t('commands/inventory:empty', {
          defaultValue: '📦 Inventory empty. Try /fish or /explore!',
        }),
      );
    }

    const renderUser = {
      ...user.toObject(),
      username: interaction.user.username,
      avatar: interaction.user.displayAvatarURL(),
    };

    const { embed, components, allItems, totalValue } = await renderInventoryPage(
      this.container,
      renderUser,
      0,
      t,
    );

    embed
      .setAuthor({
        name: t('commands/inventory:author', {
          username: interaction.user.username,
          defaultValue: `${interaction.user.username}'s Inventory`,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(
        t('commands/inventory:header', {
          stamina: user.stamina,
          maxStamina: user.maxStamina,
          count: allItems.length,
          defaultValue: `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n📦 ${allItems.length} item types`,
        }),
      )
      .setFooter({
        text: t('commands/inventory:footer', {
          total: totalValue.toLocaleString(interaction.locale),
          page: 1,
          totalPages: Math.max(1, Math.ceil(allItems.length / 10)),
          defaultValue: `Total value: ${totalValue.toLocaleString()} coins | Page 1/${Math.ceil(allItems.length / 10)}`,
        }),
      });

    const msg = await interaction.editReply({ embeds: [embed], components });

    this.container.invCache ??= new Map();
    this.container.invCache.set(msg.id, {
      allItems,
      type: 'main',
      page: 0,
      totalValue,
      userId: interaction.user.id,
      t: Date.now(),
      locale: interaction.locale,
    });

    setTimeout(
      async () => {
        try {
          const cache = this.container.invCache?.get(msg.id);
          if (!cache) return;

          let embed, components;
          if (cache.type === 'consumable') {
            const res = await renderConsumablePage(this.container, renderUser, cache.page, t);
            embed = res.embed;
            components = res.components;
          } else if (cache.type === 'equipment') {
            const res = await renderEquipmentPage(this.container, renderUser, cache.page, t);
            embed = res.embed;
            components = res.components;
          } else {
            const res = await renderInventoryPage(this.container, renderUser, cache.page, t);
            embed = res.embed;
            components = res.components;
          }

          const disabledComponents = components.map((row) => {
            const disabledRow = new ActionRowBuilder<AnyComponentBuilder>();
            for (const comp of row.components) {
              if (comp instanceof ButtonBuilder) {
                disabledRow.addComponents(ButtonBuilder.from(comp).setDisabled(true));
              } else if (comp instanceof StringSelectMenuBuilder) {
                disabledRow.addComponents(StringSelectMenuBuilder.from(comp).setDisabled(true));
              } else {
                disabledRow.addComponents(comp);
              }
            }
            return disabledRow;
          });

          const expiredEmbed = embed
            .setFooter({
              text: t('commands/inventory:expired', {
                defaultValue: '⏰ Expired — type /inventory again',
              }),
            })
            .setColor(0x808080);
          await interaction.editReply({ embeds: [expiredEmbed], components: disabledComponents });
          this.container.invCache.delete(msg.id);
        } catch {
          /* ignore */
        }
      },
      5 * 60 * 1000,
    );
  }
}
