import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
} from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { RARITY_COLOR } from '../lib/utils';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';
import type { EquipmentSlot, IEquipmentStat, IItem, IUser } from '@nova/db';

const ITEMS_PER_PAGE = 10;
const RARITY_ORDER = ['Mythic', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;
const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

const SLOT_LABEL: Record<string, string> = {
  weapon: '⚔️ Weapon',
  armor: '🛡️ Armor',
  helmet: '🪖 Helmet',
  accessory: '💍 Accessory',
  tool: '🔧 Tool',
};

@ApplyOptions<InteractionHandler.Options>({
  name: 'invUse',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvUseHandler extends InteractionHandler {
  public override parse(interaction) {
    if (typeof interaction.customId !== 'string') return this.none();
    if (
      interaction.customId.startsWith('inv_prev_') ||
      interaction.customId.startsWith('inv_next_') ||
      interaction.customId.startsWith('inv_use_') ||
      interaction.customId.startsWith('inv_equip_view_') ||
      interaction.customId.startsWith('inv_equip_select_') ||
      interaction.customId.startsWith('inv_unequip_select_')
    ) {
      return this.some();
    }
    return this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const parts = interaction.customId.split('_');
    const userId = parts[3];

    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not your inventory!' }),
        flags: MessageFlags.Ephemeral,
      });

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    if (interaction.customId.startsWith('inv_equip_view_')) {
      await interaction.deferUpdate();
      return this.renderEquipmentView(interaction, user, t);
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_equip_select_')) {
      await interaction.deferUpdate();
      const [slot, itemId] = interaction.values[0].split(':') as [EquipmentSlot, string];
      const itemData = await this.container.db.item.findOne({ itemId });
      if (!itemData) return interaction.followUp({ content: 'Item not found', ephemeral: true });

      const error = this.validateEquip(user, itemData, slot);
      if (error) return interaction.followUp({ content: error, ephemeral: true });

      if (!user.equipped) {
        user.equipped = { weapon: null, helmet: null, armor: null, accessory: null, tool: null };
      }

      const oldItemId = user.equipped[slot];
      if (oldItemId) {
        const oldInv = user.items.find((i) => i.itemId === oldItemId);
        if (oldInv) oldInv.qty += 1;
        else user.items.push({ itemId: oldItemId, qty: 1 });
      }

      user.equipped[slot] = itemId;
      user.markModified('equipped');

      const invItem = user.items.find((i) => i.itemId === itemId)!;
      invItem.qty -= 1;
      if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);

      await user.save();
      await interaction.followUp({
        content: `✅ Equipped ${itemData.emoji} **${itemData.name}** → ${SLOT_LABEL[slot]}`,
        ephemeral: true,
      });
      return this.renderEquipmentView(interaction, user, t);
    }

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith('inv_unequip_select_')
    ) {
      await interaction.deferUpdate();
      const slot = interaction.values[0] as EquipmentSlot;

      if (!user.equipped) {
        user.equipped = { weapon: null, helmet: null, armor: null, accessory: null, tool: null };
      }

      const itemId = user.equipped[slot];
      if (!itemId) return interaction.followUp({ content: 'Slot kosong', ephemeral: true });

      const itemData = await this.container.db.item.findOne({ itemId });
      const invItem = user.items.find((i) => i.itemId === itemId);
      if (invItem) invItem.qty += 1;
      else user.items.push({ itemId, qty: 1 });

      user.equipped[slot] = null;
      user.markModified('equipped');
      await user.save();
      await interaction.followUp({
        content: `📤 Unequipped **${itemData?.name}** dari ${SLOT_LABEL[slot]}`,
        ephemeral: true,
      });
      return this.renderEquipmentView(interaction, user, t);
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_use_')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const itemId = interaction.values[0];
      const item = await this.container.db.item.findOne({ itemId }).lean();
      if (!item) return interaction.followUp({ content: 'Item not found' });

      const invItem = user.items.find((i) => i.itemId === itemId);
      if (!invItem || invItem.qty < 1) return interaction.followUp({ content: 'Out of stock!' });

      const effects = item.effects || [];
      if (effects.length === 0)
        return interaction.followUp({ content: '❌ This item cannot be used' });

      let msg = `✅ Used ${item.emoji} **${item.name}**`;
      let applied = 0;
      const stats = await getPlayerStats(user);

      for (const eff of effects) {
        if (eff.type === 'heal') {
          const before = user.hp ?? 0;
          const maxHp = stats.maxHp;
          if (before >= maxHp) continue;
          user.hp = Math.min(maxHp, before + eff.value);
          const gained = user.hp - before;
          if (gained > 0) {
            msg += `\n❤️ +${gained} HP`;
            applied++;
          }
        } else if (eff.type === 'stamina') {
          const before = user.stamina ?? 0;
          const maxSt = user.maxStamina ?? 100;
          if (before >= maxSt) continue;
          user.stamina = Math.min(maxSt, before + eff.value);
          const gained = user.stamina - before;
          if (gained > 0) {
            msg += `\n⚡ +${gained} Stamina`;
            applied++;
          }
        } else if (eff.type === 'buff') {
          user.buffs = user.buffs || [];
          user.buffs.push({
            type: 'atk',
            value: eff.value,
            expires: new Date(Date.now() + 10 * 60 * 1000),
          });
          msg += `\n⚔️ ATK +${eff.value} (10m)`;
          applied++;
        }
      }

      if (applied === 0)
        return interaction.followUp({ content: `❌ ${item.emoji} **${item.name}** had no effect` });

      invItem.qty -= 1;
      if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
      await user.save();
      return interaction.followUp({ content: msg });
    }

    if (interaction.isButton()) {
      await interaction.deferUpdate();
      const [, dir, pageStr] = interaction.customId.split('_');
      let page = Number.parseInt(pageStr, 10);
      page = dir === 'next' ? page + 1 : page - 1;
      const cache = this.container.invCache!.get(interaction.message.id)!;
      const { allItems, totalValue } = cache;
      const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
      page = Math.max(0, Math.min(page, totalPages - 1));
      const pageItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
      const topRarity = pageItems[0]?.rarity || 'Common';

      const embed = new EmbedBuilder()
        .setAuthor({
          name: `${interaction.user.username}'s Inventory`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
        .setDescription(
          `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n📦 ${allItems.length} item types`,
        )
        .setFooter({
          text: `Total value: ${totalValue.toLocaleString()} coins | Page ${page + 1}/${totalPages}`,
        });

      for (const it of pageItems) embed.addFields({ name: it.text, value: it.sub });

      const components: (
        | ActionRowBuilder<ButtonBuilder>
        | ActionRowBuilder<StringSelectMenuBuilder>
      )[] = [];

      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_prev_${page}_${userId}`)
            .setLabel('◀ Previous')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page <= 0),
          new ButtonBuilder()
            .setCustomId(`inv_next_${page}_${userId}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        ),
      );

      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_equip_view_${userId}_0`)
            .setLabel('Equipments')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('⚔️'),
        ),
      );

      const itemIds = user.items.map((i) => i.itemId);
      const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } }).lean();
      const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));
      const consumables = user.items
        .filter((i) => itemMap.get(i.itemId)?.type === 'consumable')
        .map((i) => ({ inv: i, data: itemMap.get(i.itemId)! }))
        .sort((a, b) => {
          const ra = RARITY_ORDER.indexOf(a.data.rarity as any);
          const rb = RARITY_ORDER.indexOf(b.data.rarity as any);
          return ra !== rb ? ra - rb : b.inv.qty - a.inv.qty;
        })
        .slice(0, 25)
        .map((x) => x.inv);

      if (consumables.length) {
        components.push(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`inv_use_${userId}`)
              .setPlaceholder('Use consumable...')
              .addOptions(
                consumables.map((c) => {
                  const d = itemMap.get(c.itemId)!;
                  return {
                    label: `${d.name} x${c.qty}`,
                    value: c.itemId,
                    description: `${d.rarity} • ${d.description?.slice(0, 40) || ''}`,
                    emoji: sanitizeEmoji(d.emoji),
                  };
                }),
              ),
          ),
        );
      }
      await interaction.editReply({ embeds: [embed], components });
    }
  }

  private async renderEquipmentView(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    user: any,
    t: any,
  ) {
    const stats = await getPlayerStats(user);
    const allItemIds = user.items.map((i) => i.itemId);
    const itemsData = await this.container.db.item.find({ itemId: { $in: allItemIds } }).lean();
    const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));

    const equipments = user.items
      .filter((i) => itemMap.get(i.itemId)?.type === 'equipment')
      .map((i) => ({ inv: i, data: itemMap.get(i.itemId)! }))
      .sort((a, b) => {
        const ra = RARITY_ORDER.indexOf(a.data.rarity as any);
        const rb = RARITY_ORDER.indexOf(b.data.rarity as any);
        if (ra !== rb) return ra - rb;
        const sa = a.data.slot || '';
        const sb = b.data.slot || '';
        return sa.localeCompare(sb);
      })
      .map((x) => x.inv);

    const equippedIds = [
      user.equipped?.weapon,
      user.equipped?.armor,
      user.equipped?.helmet,
      user.equipped?.accessory,
      user.equipped?.tool,
    ].filter(Boolean) as string[];
    const equippedData = await this.container.db.item.find({ itemId: { $in: equippedIds } }).lean();
    const eqMap = new Map(equippedData.map((i) => [i.itemId, i]));

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.username}'s Equipment & Stats`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setColor(0x3498db)
      .addFields(
        { name: '⚔️ ATK', value: `${stats.atk}`, inline: true },
        { name: '🛡️ DEF', value: `${stats.def}`, inline: true },
        { name: '❤️ HP', value: `${user.hp}/${stats.maxHp}`, inline: true },
        { name: '💥 Crit Rate', value: `${(stats.critRate * 100).toFixed(1)}%`, inline: true },
        { name: '💢 Crit DMG', value: `${(stats.critDmg * 100).toFixed(0)}%`, inline: true },
        { name: '\u200b', value: '\u200b', inline: true },
        {
          name: 'Weapon',
          value: user.equipped?.weapon
            ? `${eqMap.get(user.equipped.weapon)?.emoji} **${eqMap.get(user.equipped.weapon)?.name}**\n> ${this.formatStats(eqMap.get(user.equipped.weapon)?.stats)}`
            : '❌ None',
          inline: true,
        },
        {
          name: 'Armor',
          value: user.equipped?.armor
            ? `${eqMap.get(user.equipped.armor)?.emoji} **${eqMap.get(user.equipped.armor)?.name}**\n> ${this.formatStats(eqMap.get(user.equipped.armor)?.stats)}`
            : '❌ None',
          inline: true,
        },
        {
          name: 'Helmet',
          value: user.equipped?.helmet
            ? `${eqMap.get(user.equipped.helmet)?.emoji} **${eqMap.get(user.equipped.helmet)?.name}**\n> ${this.formatStats(eqMap.get(user.equipped.helmet)?.stats)}`
            : '❌ None',
          inline: true,
        },
        {
          name: 'Accessory',
          value: user.equipped?.accessory
            ? `${eqMap.get(user.equipped.accessory)?.emoji} **${eqMap.get(user.equipped.accessory)?.name}**\n> ${this.formatStats(eqMap.get(user.equipped.accessory)?.stats)}`
            : '❌ None',
          inline: true,
        },
        {
          name: 'Tool',
          value: user.equipped?.tool
            ? `${eqMap.get(user.equipped.tool)?.emoji} **${eqMap.get(user.equipped.tool)?.name}**\n> ${this.formatStats(eqMap.get(user.equipped.tool)?.stats)}`
            : '❌ None',
          inline: true,
        },
        { name: '\u200b', value: '\u200b', inline: true },
      );

    const components: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

    const parts = interaction.customId.split('_');
    const page = parts.length >= 5 ? Number(parts[4]) || 0 : 0;
    const perPage = 20;
    const start = page * perPage;
    const pagedEquipments = equipments.slice(start, start + perPage);
    const totalPages = Math.ceil(equipments.length / perPage);

    if (pagedEquipments.length > 0) {
      const equipOptions = pagedEquipments.map((i) => {
        const d = itemMap.get(i.itemId)!;
        const slotName = SLOT_LABEL[d.slot || ''] || d.slot;
        return {
          label: `${d.name} x${i.qty}`.slice(0, 100),
          value: `${d.slot}:${i.itemId}`,
          description: `${slotName} • ${d.rarity} • ${this.formatStats(d.stats)}`.slice(0, 100),
          emoji: sanitizeEmoji(d.emoji),
        };
      });

      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inv_equip_select_${user.discordId}_${page}`)
            .setPlaceholder(
              `Equip item... (${start + 1}-${Math.min(start + perPage, equipments.length)}/${equipments.length})`,
            )
            .addOptions(equipOptions),
        ),
      );
    }

    if (totalPages > 1) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`inv_equip_view_${user.discordId}_${Math.max(0, page - 1)}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
          new ButtonBuilder()
            .setCustomId(`inv_equip_view_${user.discordId}_${Math.min(totalPages - 1, page + 1)}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
        ),
      );
    }

    const unequipOptions = [];
    if (user.equipped?.weapon)
      unequipOptions.push({
        label: 'Weapon',
        value: 'weapon',
        emoji: '⚔️',
        description: eqMap.get(user.equipped.weapon)?.name,
      });
    if (user.equipped?.armor)
      unequipOptions.push({
        label: 'Armor',
        value: 'armor',
        emoji: '🛡️',
        description: eqMap.get(user.equipped.armor)?.name,
      });
    if (user.equipped?.helmet)
      unequipOptions.push({
        label: 'Helmet',
        value: 'helmet',
        emoji: '🪖',
        description: eqMap.get(user.equipped.helmet)?.name,
      });
    if (user.equipped?.accessory)
      unequipOptions.push({
        label: 'Accessory',
        value: 'accessory',
        emoji: '💍',
        description: eqMap.get(user.equipped.accessory)?.name,
      });
    if (user.equipped?.tool)
      unequipOptions.push({
        label: 'Tool',
        value: 'tool',
        emoji: '🔧',
        description: eqMap.get(user.equipped.tool)?.name,
      });

    if (unequipOptions.length > 0) {
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`inv_unequip_select_${user.discordId}`)
            .setPlaceholder('Unequip slot...')
            .setOptions(
              unequipOptions.map((o) => ({
                label: o.label,
                value: o.value,
                description: o.description?.slice(0, 50),
                emoji: o.emoji,
              })),
            ),
        ),
      );
    }

    return interaction.editReply({ embeds: [embed], components });
  }

  private validateEquip(user: IUser, item: IItem, slot: EquipmentSlot): string | null {
    if (item.type !== 'equipment') return 'Item ini bukan equipment';
    if (item.slot !== slot) return `Item ini slot ${item.slot}, bukan ${slot}`;
    if (item.stats?.classLock && item.stats.classLock.length > 0) {
      if (!item.stats.classLock.includes(user.class!)) {
        return `Hanya class ${item.stats.classLock.join('/')} yang bisa equip ini`;
      }
    }
    return null;
  }

  private formatStats(stats?: IEquipmentStat): string {
    if (!stats) return '-';
    const parts = [];
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
}
