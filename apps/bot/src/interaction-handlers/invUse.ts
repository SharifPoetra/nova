import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
  StringSelectMenuInteraction,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';
import { getItemDisplay } from '../lib/rpg/item-registry';
import { renderConsumablePage } from '../lib/rpg/inventory';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<InteractionHandler.Options>({
  name: 'invUse',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvUseHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_use_') ? this.some() : this.none();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const parts = interaction.customId.split('_');
    const userId = parts[2];
    const page = Number(parts[3] || 0);

    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not yours!' }),
        flags: MessageFlags.Ephemeral,
      });

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    const itemId = interaction.values[0];
    const item = await this.container.db.item.findOne({ itemId }).lean();
    const invItem = user.items.find((i) => i.itemId === itemId);

    // DETECT DUNGEON MODE
    const isDungeon = interaction.message.components?.some(
      (row: any) =>
        'components' in row && row.components?.some((c: any) => c.customId === 'closebag'),
    );

    const refreshBag = async () => {
      const freshUser = await this.container.db.user.findOne({ discordId: userId });
      if (!freshUser) throw new Error('User not found');

      const renderUser = {
        ...freshUser.toObject(),
        discordId: userId,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
      };
      const { embed, components } = await renderConsumablePage(this.container, renderUser, page, t);

      if (!isDungeon) return { embed, components };

      const filtered = components
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

      return { embed: embed.setColor(0x2ecc71), components: [...filtered, closeRow] as any };
    };

    if (!item || !invItem || item.type !== 'consumable') {
      await interaction.followUp({
        content: t('commands/inventory:item_not_found', { defaultValue: 'Item not found' }),
        flags: MessageFlags.Ephemeral,
      });
      const bag = await refreshBag();
      return interaction.editReply({ embeds: [bag.embed], components: bag.components });
    }

    const display = await getItemDisplay(itemId, t);
    const itemName = display?.name ?? itemId;
    const stats = await getPlayerStats(user);

    let feedback = t('commands/inventory:used', {
      emoji: item.emoji,
      name: itemName,
      defaultValue: `✅ Used ${item.emoji} **${itemName}**`,
    });
    let applied = 0;

    for (const eff of item.effects || []) {
      if (eff.type === 'heal') {
        const before = user.hp ?? 0;
        const gain = Math.min(eff.value, stats.maxHp - before);
        user.hp = before + gain;
        feedback += `\n❤️ +${gain} HP` + (gain < eff.value ? ` (capped)` : '');
        if (gain > 0) applied++;
      } else if (eff.type === 'stamina') {
        const before = user.stamina ?? 0;
        const gain = Math.min(eff.value, (user.maxStamina ?? 100) - before);
        user.stamina = before + gain;
        feedback += `\n⚡ +${gain} Stamina` + (gain < eff.value ? ` (full)` : '');
        if (gain > 0) applied++;
      } else if (eff.type === 'buff') {
        user.buffs = user.buffs || [];
        user.buffs.push({
          type: 'atk',
          value: eff.value,
          expires: new Date(Date.now() + 600000),
        });
        const percent = Math.round(eff.value * 100);
        feedback += `\n⚔️ ATK +${percent}% (10m)`;
        applied++;
      }
    }

    if (applied === 0) {
      await interaction.followUp({
        content: t('commands/inventory:no_effect', {
          emoji: item.emoji,
          defaultValue: `❌ ${item.emoji} had no effect`,
        }),
        flags: MessageFlags.Ephemeral,
      });
      const bag = await refreshBag();
      return interaction.editReply({ embeds: [bag.embed], components: bag.components });
    }

    invItem.qty -= 1;
    if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
    await user.save();

    const bag = await refreshBag();

    const cache = this.container.invCache?.get(interaction.message.id);
    if (cache) {
      cache.page = page;
      cache.t = Date.now();
    }

    await interaction.followUp({
      content: feedback,
      flags: MessageFlags.Ephemeral,
    });

    return interaction.editReply({ embeds: [bag.embed], components: bag.components });
  }
}
