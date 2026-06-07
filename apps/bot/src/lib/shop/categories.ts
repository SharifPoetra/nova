import { getAllBackgrounds } from '../canvas/backgrounds.ts';
import { RARITY_COLOR, type Rarity } from '../utils.ts';

export const SHOP_CATEGORIES = {
  potions: {
    name: 'Potions',
    emoji: '🧪',
    description: 'Restore HP & Stamina',
  },
  backgrounds: {
    name: 'Backgrounds',
    emoji: '🖼️',
    description: 'Customize your profile card',
  },
} as const;

export type ShopCategory = keyof typeof SHOP_CATEGORIES;

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  price: number;
  description: string;
  rarity?: Rarity;
  rarityColor?: number;
}

/**
 * Get shop items for a specific category
 * Potions are hardcoded, backgrounds are fetched from registry
 */
export function getShopItems(category: ShopCategory): ShopItem[] {
  if (category === 'potions') {
    return [
      {
        id: 'potion_stamina',
        name: 'Stamina Potion',
        emoji: '🧪',
        price: 50,
        description: 'Restore 30 stamina',
        rarity: 'Common',
        rarityColor: RARITY_COLOR.Common,
      },
      {
        id: 'potion_hp',
        name: 'Health Potion',
        emoji: '❤️',
        price: 100,
        description: 'Restore 50 HP',
        rarity: 'Common',
        rarityColor: RARITY_COLOR.Common,
      },
    ];
  }

  if (category === 'backgrounds') {
    return getAllBackgrounds()
      .filter((bg) => bg.price > 0) // default background is free
      .sort((a, b) => {
        const order = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };
        return order[a.rarity] - order[b.rarity] || a.price - b.price;
      })
      .map((bg) => ({
        id: `bg_${bg.id}`,
        name: bg.name,
        emoji: getRarityEmoji(bg.rarity),
        price: bg.price,
        description: bg.description || `${bg.rarity} background`,
        rarity: bg.rarity,
        rarityColor: RARITY_COLOR[bg.rarity],
      }));
  }

  return [];
}

/**
 * Get a specific item by ID from a category
 */
export function getItemById(category: ShopCategory, id: string): ShopItem | undefined {
  return getShopItems(category).find((i) => i.id === id);
}

/**
 * Get potion items (for legacy compatibility)
 */
export function getPotionItems(): ShopItem[] {
  return getShopItems('potions');
}

/**
 * Get background items (for display/filtering)
 */
export function getBackgroundItems(): ShopItem[] {
  return getShopItems('backgrounds');
}

/**
 * Map rarity to emoji
 */
export function getRarityEmoji(rarity: Rarity): string {
  const emojiMap: Record<Rarity, string> = {
    Common: '🖼️',
    Uncommon: '🌸',
    Rare: '💎',
    Epic: '✨',
    Legendary: '👑',
    Mythic: '⭐',
  };
  return emojiMap[rarity] || '🖼️';
}
