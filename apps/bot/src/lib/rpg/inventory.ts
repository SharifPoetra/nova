import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { RARITY_COLOR, RARITY_ORDER } from '../utils';
import {
  User,
  Item,
  type IItem,
  type IItemEffect,
  type IEquipmentStat,
  type EquipmentSlot,
  type IUser,
} from '@nova/db';
import type { TFunction } from 'i18next';
import { getItemDisplay } from './item-registry';
import { getPlayerStats } from './combat';

const ITEMS_PER_PAGE = 10;
const ITEMS_PER_PAGE_CONSUMABLE = 25;
const ITEMS_PER_PAGE_EQUIP = 20;

const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

type CachedInv = {
  allItems: { id: string; text: string; sub: string; value: number; rarity: string }[];
  totalValue: number;
  userId: string;
  locale: string;
};

type RenderUser = Pick<
  IUser,
  | 'discordId'
  | 'stamina'
  | 'maxStamina'
  | 'items'
  | 'equipped'
  | 'class'
  | 'level'
  | 'hp'
  | 'maxHp'
  | 'buffs'
  | 'balance'
  | 'bank'
> & {
  username?: string | null;
  avatar?: string | null;
};

export const formatStats = (stats?: IEquipmentStat): string => {
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
};

export const formatEffect = (effect?: IItemEffect): string => {
  if (!effect) return '';
  switch (effect.type) {
    case 'heal':
      return `+${effect.value} HP`;
    case 'stamina':
      return `+${effect.value} Stamina`;
    case 'buff':
      return `+${(effect.value * 100).toFixed(0)}% ATK`;
    default:
      return '';
  }
};

const getItemsMap = async (container: any, ids: string[]): Promise<Map<string, IItem>> => {
  if (!ids.length) return new Map();
  const items = (await container.db.item.find({ itemId: { $in: ids } }).lean()) as IItem[];
  return new Map(items.map((i) => [i.itemId, i]));
};

const SLOT_LABEL_KEY: Record<EquipmentSlot, string> = {
  weapon: 'commands/equipment:slot.weapon',
  armor: 'commands/equipment:slot.armor',
  helmet: 'commands/equipment:slot.helmet',
  accessory: 'commands/equipment:slot.accessory',
  tool: 'commands/equipment:slot.tool',
};

const getSlotLabels = (t: TFunction) => ({
  weapon: t(SLOT_LABEL_KEY.weapon, { defaultValue: '⚔️ Weapon' }),
  armor: t(SLOT_LABEL_KEY.armor, { defaultValue: '🛡️ Armor' }),
  helmet: t(SLOT_LABEL_KEY.helmet, { defaultValue: '🪖 Helmet' }),
  accessory: t(SLOT_LABEL_KEY.accessory, { defaultValue: '💍 Accessory' }),
  tool: t(SLOT_LABEL_KEY.tool, { defaultValue: '🔧 Tool' }),
});

// ===== INVENTORY CORE =====
export interface ItemInput {
  itemId: string;
  emoji: string;
  type: 'material' | 'equipment' | 'consumable';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  sellPrice: number;
  slot?: EquipmentSlot;
  stats?: IEquipmentStat;
  effects?: IItemEffect[];
}

export async function addItemToInventory(
  discordId: string,
  itemData: ItemInput,
  qty = 1,
): Promise<void> {
  await Item.updateOne(
    { itemId: itemData.itemId },
    {
      $set: {
        ...itemData,
        slot: itemData.slot ?? null,
        stats: itemData.stats ?? null,
        effects: itemData.effects ?? [],
      },
    },
    { upsert: true },
  );
  const user = await User.findOne({ discordId });
  if (!user) throw new Error('User not found');
  const existing = user.items.find((i) => i.itemId === itemData.itemId);
  if (existing) existing.qty += qty;
  else user.items.push({ itemId: itemData.itemId, qty });
  await user.save();
}

export async function removeItemFromInventory(
  discordId: string,
  itemId: string,
  qty = 1,
): Promise<boolean> {
  const user = await User.findOne({ discordId });
  if (!user) return false;
  const item = user.items.find((i) => i.itemId === itemId);
  if (!item || item.qty < qty) return false;
  item.qty -= qty;
  if (item.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
  await user.save();
  return true;
}

// ===== RENDERERS =====
export async function renderInventoryPage(
  container: any,
  user: RenderUser,
  page = 0,
  t: TFunction,
  messageId?: string,
) {
  const cache = messageId
    ? (container.invCache?.get(messageId) as CachedInv | undefined)
    : undefined;
  let allItems: CachedInv['allItems'];
  let totalValue: number;
  let locale = 'en-US';

  if (cache) {
    ({ allItems, totalValue, locale } = cache);
  } else {
    const itemMap = await getItemsMap(
      container,
      user.items.map((i) => i.itemId),
    );
    totalValue = 0;
    allItems = [];
    for (const inv of user.items) {
      const data = itemMap.get(inv.itemId);
      if (!data) continue;
      const display = await getItemDisplay(inv.itemId, t);
      const name = display?.name ?? inv.itemId;
      const desc = display?.description || '-';
      const value = (data.sellPrice ?? 0) * inv.qty;
      totalValue += value;
      allItems.push({
        id: inv.itemId,
        text: `${data.emoji} **${name}** x${inv.qty}`,
        sub: `> ${value.toLocaleString(locale)} 💰 • ${desc}`,
        value,
        rarity: data.rarity || 'Common',
      });
    }
    allItems.sort((a, b) => {
      const ra = RARITY_ORDER.indexOf(a.rarity as any);
      const rb = RARITY_ORDER.indexOf(b.rarity as any);
      return ra !== rb ? ra - rb : b.value - a.value;
    });
  }

  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const topRarity = pageItems[0]?.rarity || 'Common';

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${user.username || 'Your'} Inventory`, iconURL: user.avatar ?? undefined })
    .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
    .setDescription(
      `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n💰 Balance: ${user.balance?.toLocaleString() ?? 0}\n📦 ${allItems.length} item types`,
    )
    .setFooter({
      text: `Total value: ${totalValue.toLocaleString(locale)} coins | Page ${page + 1}/${totalPages}`,
    });

  for (const it of pageItems) embed.addFields({ name: it.text, value: it.sub });

  const components: ActionRowBuilder<any>[] = [];
  if (totalPages > 1) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`inv_prev_${page}_${user.discordId}`)
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(`inv_next_${page}_${user.discordId}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      ),
    );
  }
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_equip_view_${user.discordId}_0`)
        .setLabel('Equipments')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
      new ButtonBuilder()
        .setCustomId(`inv_consumable_view_${user.discordId}_0`)
        .setLabel('Consumables')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🥤'),
    ),
  );

  return { embed, components, allItems, totalValue };
}

export async function renderConsumablePage(
  container: any,
  user: RenderUser,
  page = 0,
  t: TFunction,
) {
  const itemMap = await getItemsMap(
    container,
    user.items.map((i) => i.itemId),
  );
  const consumables = user.items
    .map((inv) => ({ inv, data: itemMap.get(inv.itemId) }))
    .filter((x) => x.data?.type === 'consumable')
    .sort(
      (a, b) =>
        RARITY_ORDER.indexOf(a.data!.rarity) - RARITY_ORDER.indexOf(b.data!.rarity) ||
        b.inv.qty - a.inv.qty,
    );

  const totalPages = Math.max(1, Math.ceil(consumables.length / ITEMS_PER_PAGE_CONSUMABLE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = consumables.slice(
    page * ITEMS_PER_PAGE_CONSUMABLE,
    (page + 1) * ITEMS_PER_PAGE_CONSUMABLE,
  );

  const lines = await Promise.all(
    pageItems.map(async ({ inv, data }) => {
      const display = await getItemDisplay(inv.itemId, t);
      const name = display?.name ?? inv.itemId;
      const eff = formatEffect(data!.effects?.[0]);
      return `${sanitizeEmoji(data!.emoji) || ''} **${name}** ×${inv.qty} • ${eff} • ${data!.rarity}`;
    }),
  );

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${user.username || 'Your'} Consumables`,
      iconURL: user.avatar ?? undefined,
    })
    .setColor(0x2ecc71)
    .setDescription(lines.join('\n') || 'None')
    .setFooter({ text: `Page ${page + 1}/${totalPages}` });

  const components: ActionRowBuilder<any>[] = [];
  components.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_back_${user.discordId}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('↩️'),
      new ButtonBuilder()
        .setCustomId(`inv_consumable_view_${user.discordId}_${page - 1}`)
        .setEmoji('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`inv_consumable_view_${user.discordId}_${page + 1}`)
        .setEmoji('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    ),
  );
  if (pageItems.length) {
    const options = await Promise.all(
      pageItems.map(async ({ inv, data }) => {
        const display = await getItemDisplay(inv.itemId, t);
        return {
          label: `${display?.name ?? inv.itemId} x${inv.qty}`.slice(0, 100),
          value: inv.itemId,
          description: data!.rarity.slice(0, 50),
          emoji: sanitizeEmoji(data!.emoji),
        };
      }),
    );
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`inv_use_${user.discordId}_${page}`)
          .setPlaceholder('Use consumable...')
          .addOptions(options),
      ),
    );
  }
  return { embed, components };
}

export async function renderEquipmentPage(
  container: any,
  user: RenderUser,
  page = 0,
  t: TFunction,
) {
  const SLOT_LABEL = getSlotLabels(t);
  const stats = await getPlayerStats(user as any);
  const itemMap = await getItemsMap(
    container,
    user.items.map((i) => i.itemId),
  );

  const equips = user.items
    .map((inv) => ({ inv, data: itemMap.get(inv.itemId)! }))
    .filter((x) => x.data?.type === 'equipment')
    .sort((a, b) => RARITY_ORDER.indexOf(a.data.rarity) - RARITY_ORDER.indexOf(b.data.rarity));

  const totalPages = Math.max(1, Math.ceil(equips.length / ITEMS_PER_PAGE_EQUIP));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const start = page * ITEMS_PER_PAGE_EQUIP;
  const paged = equips.slice(start, start + ITEMS_PER_PAGE_EQUIP);

  const equippedIds = [
    user.equipped?.weapon,
    user.equipped?.armor,
    user.equipped?.helmet,
    user.equipped?.accessory,
    user.equipped?.tool,
  ].filter(Boolean) as string[];
  const eqMap = await getItemsMap(container, equippedIds);

  const equippedFields = await Promise.all(
    (['weapon', 'armor', 'helmet', 'accessory', 'tool'] as const).map(async (s) => {
      const itemId = user.equipped?.[s];
      if (!itemId)
        return {
          name: SLOT_LABEL[s],
          value: t('commands/equipment:none', { defaultValue: '❌ None' }),
          inline: true,
        };
      const data = eqMap.get(itemId);
      const display = await getItemDisplay(itemId, t);
      const name = display?.name ?? itemId;
      return {
        name: SLOT_LABEL[s],
        value: `${data?.emoji ?? '❓'} **${name}**\n> ${formatStats(data?.stats)}`,
        inline: true,
      };
    }),
  );

  const embed = new EmbedBuilder()
    .setAuthor({
      name: t('commands/equipment:title', {
        username: user.username || 'User',
        defaultValue: `${user.username}'s Equipment`,
      }),
      iconURL: user.avatar ?? undefined,
    })
    .setColor(0x3498db)
    .setDescription(
      `**Stats**\n` +
        `⚔️ ${stats.atk}  •  🛡️ ${stats.def}  •  ❤️ ${stats.hp}/${stats.maxHp}\n` +
        `💥 ${(stats.critRate * 100).toFixed(1)}%  •  💢 ${(stats.critDmg * 100).toFixed(0)}%\n\n` +
        `**Equipped**`,
    )
    .addFields(equippedFields);

  const components: ActionRowBuilder<any>[] = [];
  components.push(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_back_${user.discordId}`)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('↩️'),
      new ButtonBuilder()
        .setCustomId(`inv_equip_view_${user.discordId}_${page - 1}`)
        .setLabel('◀')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),
      new ButtonBuilder()
        .setCustomId(`inv_equip_view_${user.discordId}_${page + 1}`)
        .setLabel('▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),
    ),
  );
  if (paged.length) {
    const options = await Promise.all(
      paged.map(async ({ inv, data }) => {
        const display = await getItemDisplay(inv.itemId, t);
        return {
          label: `${display?.name ?? inv.itemId} x${inv.qty}`.slice(0, 100),
          value: `${data.slot}:${inv.itemId}`,
          description:
            `${SLOT_LABEL[data.slot!]} • ${data.rarity} • ${formatStats(data.stats)}`.slice(0, 100),
          emoji: sanitizeEmoji(data.emoji),
        };
      }),
    );
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`inv_equip_select_${user.discordId}_${page}`)
          .setPlaceholder(
            t('commands/equipment:equip_placeholder', {
              start: start + 1,
              end: Math.min(start + ITEMS_PER_PAGE_EQUIP, equips.length),
              total: equips.length,
              defaultValue: `Equip (${start + 1}-${Math.min(start + ITEMS_PER_PAGE_EQUIP, equips.length)}/${equips.length})`,
            }),
          )
          .addOptions(options),
      ),
    );
  }

  const unequipped = (['weapon', 'armor', 'helmet', 'accessory', 'tool'] as const).filter(
    (s) => user.equipped?.[s],
  );
  if (unequipped.length) {
    components.push(
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
              emoji: sanitizeEmoji(SLOT_LABEL[s]),
            })),
          ),
      ),
    );
  }
  return { embed, components };
}
