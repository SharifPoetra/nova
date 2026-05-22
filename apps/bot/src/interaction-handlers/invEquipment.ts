import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';
import { renderInventoryPage } from '../lib/rpg/inventory';
import { RARITY_ORDER } from '../lib/utils';
import type { EquipmentSlot, IEquipmentStat, IUser, IItem } from '@nova/db';
import { getItemDisplay } from '../lib/rpg/item-registry';
import { fetchT } from '@sapphire/plugin-i18next';

const sanitize = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

@ApplyOptions<InteractionHandler.Options>({
  name: 'invEquipment',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvEquipmentHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_equip_') ||
      i.customId?.startsWith('inv_unequip_') ||
      i.customId?.startsWith('inv_back_')
      ? this.some()
      : this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const SLOT_LABEL: Record<string, string> = {
      weapon: t('commands/equipment:slot.weapon', { defaultValue: '⚔️ Weapon' }),
      armor: t('commands/equipment:slot.armor', { defaultValue: '🛡️ Armor' }),
      helmet: t('commands/equipment:slot.helmet', { defaultValue: '🪖 Helmet' }),
      accessory: t('commands/equipment:slot.accessory', { defaultValue: '💍 Accessory' }),
      tool: t('commands/equipment:slot.tool', { defaultValue: '🔧 Tool' }),
    };

    const parts = interaction.customId.split('_');
    const userId = interaction.customId.startsWith('inv_back_') ? parts[2] : parts[3];
    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not yours' }),
        flags: MessageFlags.Ephemeral,
      });

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    if (interaction.customId.startsWith('inv_back_')) {
      await interaction.deferUpdate();
      const { embed, components } = await renderInventoryPage(
        this.container,
        {
          ...user.toObject(),
          discordId: userId,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
        0,
        t,
        undefined,
      );
      return interaction.editReply({ embeds: [embed], components });
    }

    if (interaction.customId.startsWith('inv_equip_view_')) {
      await interaction.deferUpdate();
      return this.renderEquip(interaction, user, t, SLOT_LABEL);
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_equip_select_')) {
      await interaction.deferUpdate();
      const [slot, itemId] = interaction.values[0].split(':') as [EquipmentSlot, string];
      const item = await this.container.db.item.findOne({ itemId });
      if (!item || item.slot !== slot)
        return interaction.followUp({
          content: t('commands/equipment:invalid', { defaultValue: 'Invalid' }),
          flags: MessageFlags.Ephemeral,
        });

      const error = this.validateEquip(user, item, slot, t);
      if (error)
        return interaction.followUp({ content: `❌ ${error}`, flags: MessageFlags.Ephemeral });

      const beforeStats = await getPlayerStats(user);
      const wasFullHp = user.hp >= beforeStats.maxHp;

      if (!user.equipped)
        user.equipped = { weapon: null, helmet: null, armor: null, accessory: null, tool: null };
      const old = user.equipped?.[slot];
      if (old) {
        const inv = user.items.find((i) => i.itemId === old);
        if (inv) inv.qty++;
        else user.items.push({ itemId: old, qty: 1 });
      }
      user.equipped[slot] = itemId;
      user.markModified('equipped');
      const invItem = user.items.find((i) => i.itemId === itemId)!;
      invItem.qty--;
      if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);

      await user.save();

      const afterStats = await getPlayerStats(user);
      if (wasFullHp) user.hp = afterStats.maxHp;
      else user.hp = Math.min(user.hp, afterStats.maxHp);
      await user.save();

      const display = await getItemDisplay(itemId, t);
      const name = display?.name ?? itemId;
      await interaction.followUp({
        content: t('commands/equipment:equipped', {
          emoji: item.emoji,
          name,
          slot: SLOT_LABEL[slot],
          defaultValue: `✅ Equipped ${item.emoji} **${name}** → ${SLOT_LABEL[slot]}`,
        }),
        flags: MessageFlags.Ephemeral,
      });
      return this.renderEquip(interaction, user, t, SLOT_LABEL);
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('inv_unequip_select_')
    ) {
      await interaction.deferUpdate();
      const slot = interaction.values[0] as EquipmentSlot;
      const itemId = user.equipped?.[slot];
      if (!itemId)
        return interaction.followUp({
          content: t('commands/equipment:empty', { defaultValue: 'Empty' }),
          flags: MessageFlags.Ephemeral,
        });

      const beforeStats = await getPlayerStats(user);
      const wasFullHp = user.hp >= beforeStats.maxHp;

      const inv = user.items.find((i) => i.itemId === itemId);
      if (inv) inv.qty++;
      else user.items.push({ itemId, qty: 1 });
      user.equipped[slot] = null;
      user.markModified('equipped');
      await user.save();

      const afterStats = await getPlayerStats(user);
      if (wasFullHp) user.hp = afterStats.maxHp;
      else user.hp = Math.min(user.hp, afterStats.maxHp);
      if (user.hp < 0) user.hp = 0;
      await user.save();

      await interaction.followUp({
        content: t('commands/equipment:unequipped', {
          slot: SLOT_LABEL[slot],
          defaultValue: `📤 Unequipped ${SLOT_LABEL[slot]}`,
        }),
        flags: MessageFlags.Ephemeral,
      });
      return this.renderEquip(interaction, user, t, SLOT_LABEL);
    }
  }

  private validateEquip(user: IUser, item: IItem, slot: EquipmentSlot, t: any): string | null {
    if (item.type !== 'equipment')
      return t('commands/equipment:not_equip', { defaultValue: 'Item ini bukan equipment' });
    if (item.slot !== slot)
      return t('commands/equipment:wrong_slot', {
        slot: item.slot,
        need: slot,
        defaultValue: `Item ini slot ${item.slot}, bukan ${slot}`,
      });
    if (item.stats?.classLock?.length) {
      if (user.class && !item.stats?.classLock?.includes(user.class)) {
        return t('commands/equipment:class_lock', {
          classes: item.stats.classLock.join('/'),
          defaultValue: `Hanya class ${item.stats.classLock.join('/')} yang bisa equip ini`,
        });
      }
    }
    return null;
  }

  private formatStats(stats?: IEquipmentStat): string {
    if (!stats) return '-';
    const parts: string[] = [];
    if (stats.atk) parts.push(`ATK +${stats.atk}`);
    if (stats.def) parts.push(`DEF +${stats.def}`);
    if (stats.hp) parts.push(`HP +${stats.hp}`);
    if (stats.critRate) parts.push(`Crit +${(stats.critRate * 100).toFixed(0)}%`);
    if (stats.critDmg) parts.push(`C.DMG +${((stats.critDmg - 1) * 100).toFixed(0)}%`);
    if (stats.fishBonus) parts.push(`Fish +${(stats.fishBonus * 100).toFixed(0)}%`);
    if (stats.mineBonus) parts.push(`Mine +${(stats.mineBonus * 100).toFixed(0)}%`);
    if (stats.gatherBonus) parts.push(`Gather +${(stats.gatherBonus * 100).toFixed(0)}%`);
    if (stats.element && stats.element !== 'phys') parts.push(stats.element.toUpperCase());
    return parts.join(' • ') || '-';
  }

  private async renderEquip(
    interaction: any,
    user: any,
    t: any,
    SLOT_LABEL: Record<string, string>,
  ) {
    const stats = await getPlayerStats(user);
    const itemMap = new Map(
      (
        await this.container.db.item
          .find({ itemId: { $in: user.items.map((i: any) => i.itemId) } })
          .lean()
      ).map((i: any) => [i.itemId, i]),
    );
    const equips = user.items
      .filter((i: any) => itemMap.get(i.itemId)?.type === 'equipment')
      .map((i: any) => ({ inv: i, data: itemMap.get(i.itemId) }))
      .sort((a, b) => RARITY_ORDER.indexOf(a.data.rarity) - RARITY_ORDER.indexOf(b.data.rarity))
      .map((x) => x.inv);

    const page = Number(interaction.customId.split('_')[4] || 0);
    const perPage = 20;
    const start = page * perPage;
    const paged = equips.slice(start, start + perPage);
    const totalPages = Math.ceil(equips.length / perPage);
    const equippedIds = [
      user.equipped?.weapon,
      user.equipped?.armor,
      user.equipped?.helmet,
      user.equipped?.accessory,
      user.equipped?.tool,
    ].filter(Boolean) as string[];
    const eqMap = new Map(
      equippedIds.length
        ? (await this.container.db.item.find({ itemId: { $in: equippedIds } }).lean()).map(
            (i: any) => [i.itemId, i],
          )
        : [],
    );

    const equippedFields = await Promise.all(
      (['weapon', 'armor', 'helmet', 'accessory', 'tool'] as const).map(async (s) => {
        const itemId = user.equipped?.[s];
        if (!itemId) {
          return {
            name: SLOT_LABEL[s],
            value: t('commands/equipment:none', { defaultValue: '❌ None' }),
            inline: true,
          };
        }
        const data = eqMap.get(itemId);
        const display = await getItemDisplay(itemId, t);
        const name = display?.name ?? data?.name ?? itemId;
        return {
          name: SLOT_LABEL[s],
          value: `${data?.emoji} **${name}**\n> ${this.formatStats(data?.stats)}`,
          inline: true,
        };
      }),
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: t('commands/equipment:title', {
          username: interaction.user.username,
          defaultValue: `${interaction.user.username}'s Equipment`,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setColor(0x3498db)
      .addFields(
        { name: '⚔️ ATK', value: `${stats.atk}`, inline: true },
        { name: '🛡️ DEF', value: `${stats.def}`, inline: true },
        { name: '❤️ HP', value: `${stats.hp}/${stats.maxHp}`, inline: true },
        {
          name: t('commands/equipment:crit_rate', { defaultValue: '💥 Crit Rate' }),
          value: `${(stats.critRate * 100).toFixed(1)}%`,
          inline: true,
        },
        {
          name: t('commands/equipment:crit_dmg', { defaultValue: '💢 Crit DMG' }),
          value: `${(stats.critDmg * 100).toFixed(0)}%`,
          inline: true,
        },
        { name: '\u200b', value: '\u200b', inline: true },
        ...equippedFields,
      );

    const comps: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];
    if (paged.length)
      comps.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inv_equip_select_${user.discordId}_${page}`)
            .setPlaceholder(
              t('commands/equipment:equip_placeholder', {
                start: start + 1,
                end: Math.min(start + perPage, equips.length),
                total: equips.length,
                defaultValue: `Equip (${start + 1}-${Math.min(start + perPage, equips.length)}/${equips.length})`,
              }),
            )
            .addOptions(
              await Promise.all(
                paged.map(async (i) => {
                  const d = itemMap.get(i.itemId)!;
                  const display = await getItemDisplay(i.itemId, t);
                  return {
                    label: `${display?.name ?? d.name} x${i.qty}`.slice(0, 100),
                    value: `${d.slot}:${i.itemId}`,
                    description:
                      `${SLOT_LABEL[d.slot]} • ${d.rarity} • ${this.formatStats(d.stats)}`.slice(
                        0,
                        100,
                      ),
                    emoji: sanitize(d.emoji),
                  };
                }),
              ),
            ),
        ),
      );
    if (totalPages > 1)
      comps.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_equip_view_${user.discordId}_${Math.max(0, page - 1)}`)
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`inv_equip_view_${user.discordId}_${Math.min(totalPages - 1, page + 1)}`)
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        ),
      );
    const unequipped = (['weapon', 'armor', 'helmet', 'accessory', 'tool'] as const).filter(
      (s) => user.equipped?.[s],
    );
    if (unequipped.length)
      comps.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inv_unequip_select_${user.discordId}`)
            .setPlaceholder(
              t('commands/equipment:unequip_placeholder', { defaultValue: 'Unequip...' }),
            )
            .addOptions(
              unequipped.map((s) => ({
                label: SLOT_LABEL[s],
                value: s,
                emoji: sanitize(SLOT_LABEL[s]),
              })),
            ),
        ),
      );
    comps.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`inv_back_${user.discordId}`)
          .setLabel(t('commands/equipment:back', { defaultValue: 'Back to Inventory' }))
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('📦'),
      ),
    );

    return interaction.editReply({ embeds: [embed], components: comps });
  }
}
