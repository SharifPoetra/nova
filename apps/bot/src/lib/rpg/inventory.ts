import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { RARITY_COLOR, RARITY_ORDER } from '../utils';
import { User, Item, type IItem, type IUser } from '@nova/db';

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

export async function addItemToInventory(
  discordId: string,
  itemData: IItem,
  qty: number = 1,
): Promise<void> {
  // Pastikan item ada di collection Item (auto-insert/update)
  await Item.updateOne(
    { itemId: itemData.itemId },
    {
      $set: {
        name: itemData.name,
        emoji: itemData.emoji,
        type: itemData.type,
        rarity: itemData.rarity,
        sellPrice: itemData.sellPrice,
        description: itemData.description ?? '',
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
      const value = (data.sellPrice ?? 0) * inv.qty;
      totalValue += value;
      allItems.push({
        id: inv.itemId,
        text: `${data.emoji} **${data.name}** x${inv.qty}`,
        sub: `> ${value.toLocaleString(locale)} 💰 • ${data.description || '-'}`,
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
    ? ((await container.db.item.find({ itemId: { $in: consumableIds } }).lean()) as IItem[])
    : [];
  const itemMap = new Map<string, IItem>(consumableData.map((i) => [i.itemId, i]));

  const consumables = user.items
    .filter((i) => itemMap.get(i.itemId)?.type === 'consumable')
    .map((i) => ({ inv: i, data: itemMap.get(i.itemId)! }))
    .sort((a, b) => {
      const ra = RARITY_ORDER.indexOf(a.data.rarity as (typeof RARITY_ORDER)[number]);
      const rb = RARITY_ORDER.indexOf(b.data.rarity as (typeof RARITY_ORDER)[number]);
      return ra !== rb ? ra - rb : b.inv.qty - a.inv.qty;
    })
    .slice(0, 25)
    .map((x) => x.inv);

  if (consumables.length) {
    components.push(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`inv_use_${user.discordId}`)
          .setPlaceholder('Use consumable...')
          .addOptions(
            consumables.map((c) => {
              const d = itemMap.get(c.itemId)!;
              return {
                label: `${d.name} x${c.qty}`.slice(0, 100),
                value: c.itemId,
                description: `${d.rarity} • ${(d.description || '').slice(0, 40)}`,
                emoji: sanitizeEmoji(d.emoji),
              };
            }),
          ),
      ),
    );
  }

  return { embed, components, allItems, totalValue };
}
