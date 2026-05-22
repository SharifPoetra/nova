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

const ITEMS_PER_PAGE = 10;
const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

type CachedInv = {
  allItems: { id: string; text: string; sub: string; value: number; rarity: string }[];
  totalValue: number;
  userId: string;
  locale: string;
};

type RenderUser = Pick<IUser, 'discordId' | 'stamina' | 'maxStamina' | 'items'> & {
  username?: string | null;
  avatar?: string | null;
};

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
  qty: number = 1,
): Promise<void> {
  // Pastikan item ada di collection Item (auto-insert/update)
  await Item.updateOne(
    { itemId: itemData.itemId },
    {
      $set: {
        emoji: itemData.emoji,
        type: itemData.type,
        rarity: itemData.rarity,
        sellPrice: itemData.sellPrice,
        slot: itemData.slot ?? null,
        stats: itemData.stats ?? null,
        effects: itemData.effects ?? [],
      },
    },
    { upsert: true },
  );

  // Tambah ke inventory user
  const user = await User.findOne({ discordId });
  if (!user) throw new Error('User not found');

  const existing = user.items.find((i) => i.itemId === itemData.itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    user.items.push({ itemId: itemData.itemId, qty });
  }

  await user.save();
}

export async function removeItemFromInventory(
  discordId: string,
  itemId: string,
  qty: number = 1,
): Promise<boolean> {
  const user = await User.findOne({ discordId });
  if (!user) return false;

  const item = user.items.find((i) => i.itemId === itemId);
  if (!item || item.qty < qty) return false;

  item.qty -= qty;
  if (item.qty <= 0) {
    user.items = user.items.filter((i) => i.itemId !== itemId);
  }

  await user.save();
  return true;
}

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
    const itemIds = user.items.map((i) => i.itemId);
    const itemsData = itemIds.length
      ? ((await container.db.item.find({ itemId: { $in: itemIds } }).lean()) as IItem[])
      : [];
    const itemMap = new Map<string, IItem>(itemsData.map((i) => [i.itemId, i]));

    totalValue = 0;
    allItems = [];

    for (const inv of user.items) {
      const data = itemMap.get(inv.itemId);
      if (!data) continue;

      const display = await getItemDisplay(inv.itemId, t);
      const name = display?.name ?? inv.itemId;
      const desc = display?.description || inv.itemId || '-';

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
      const ra = RARITY_ORDER.indexOf(a.rarity as (typeof RARITY_ORDER)[number]);
      const rb = RARITY_ORDER.indexOf(b.rarity as (typeof RARITY_ORDER)[number]);
      return ra !== rb ? ra - rb : b.value - a.value;
    });
  }

  const totalPages = Math.max(1, Math.ceil(allItems.length / ITEMS_PER_PAGE));
  page = Math.max(0, Math.min(page, totalPages - 1));
  const pageItems = allItems.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
  const topRarity = pageItems[0]?.rarity || 'Common';

  const embed = new EmbedBuilder()
    .setAuthor({
      name: `${user.username || 'Your'} Inventory`,
      iconURL: user.avatar ?? undefined,
    })
    .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
    .setDescription(
      `⚡ Stamina: ${user.stamina}/${user.maxStamina}\n📦 ${allItems.length} item types`,
    )
    .setFooter({
      text: `Total value: ${totalValue.toLocaleString(locale)} coins | Page ${page + 1}/${totalPages}`,
    });

  for (const it of pageItems) embed.addFields({ name: it.text, value: it.sub });

  const components: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

  if (totalPages > 1) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
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
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`inv_equip_view_${user.discordId}_0`)
        .setLabel('Equipments')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('⚔️'),
    ),
  );

  const consumableIds = user.items.map((i) => i.itemId);
  const consumableData = consumableIds.length
    ? ((await container.db.item
        .find({ itemId: { $in: consumableIds }, type: 'consumable' })
        .lean()) as IItem[])
    : [];
  const consumableMap = new Map<string, IItem>(consumableData.map((i) => [i.itemId, i]));

  const consumablesData: any[] = [];
  for (const inv of user.items) {
    const d = consumableMap.get(inv.itemId);
    if (!d) continue;
    const display = await getItemDisplay(inv.itemId, t);
    consumablesData.push({
      id: inv.itemId,
      qty: inv.qty,
      name: display?.name ?? inv.itemId,
      desc: display?.description || inv.itemId || '',
      rarity: d.rarity || 'Common',
      emoji: sanitizeEmoji(d.emoji),
    });
  }
  consumablesData.sort((a, b) => {
    const ra = RARITY_ORDER.indexOf(a.rarity as any);
    const rb = RARITY_ORDER.indexOf(b.rarity as any);
    return ra !== rb ? ra - rb : b.qty - a.qty;
  });

  if (consumablesData.length) {
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`inv_use_${user.discordId}`)
          .setPlaceholder(
            t('commands/inventory:use_placeholder', { defaultValue: 'Use consumable...' }),
          )
          .addOptions(
            consumablesData.slice(0, 25).map((c) => ({
              label: `${c.name} x${c.qty}`.slice(0, 100),
              value: c.id,
              description: `${c.rarity} • ${c.desc}`.slice(0, 50),
              emoji: c.emoji,
            })),
          ),
      ),
    );
  }

  return { embed, components, allItems, totalValue };
}
