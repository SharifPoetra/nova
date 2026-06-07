import type { Rarity } from '../utils.ts';
import type { IItemEffect } from '@nova/db';

export interface ExploreItem {
  id: string;
  emoji: string;
  qty: number;
  rarity: Rarity;
  sellPrice: number;
  type: 'material' | 'consumable';
  effects?: IItemEffect[];
}

export interface ExploreOutcome {
  id: string;
  coins: number;
  exp: number;
  emoji: string;
  rarity: Rarity;
  chance: number;
  item?: ExploreItem;
}

export const EXPLORES: ExploreOutcome[] = [
  // COMMON
  {
    id: 'mist',
    coins: 30,
    exp: 25,
    emoji: '🌫️',
    rarity: 'Common',
    chance: 20,
  },
  {
    id: 'gold_coins',
    coins: 100,
    exp: 20,
    emoji: '✨',
    rarity: 'Common',
    chance: 15,
  },
  {
    id: 'mushroom_found',
    coins: 40,
    exp: 12,
    emoji: '🍄',
    rarity: 'Common',
    chance: 10,
    item: { id: 'mushroom', emoji: '🍄', qty: 3, rarity: 'Common', sellPrice: 8, type: 'material' },
  },
  {
    id: 'chili_found',
    coins: 50,
    exp: 15,
    emoji: '🌶️',
    rarity: 'Common',
    chance: 10,
    item: { id: 'chili', emoji: '🌶️', qty: 2, rarity: 'Common', sellPrice: 15, type: 'material' },
  },
  {
    id: 'wood_found',
    coins: 35,
    exp: 10,
    emoji: '🪵',
    rarity: 'Common',
    chance: 12,
    item: { id: 'wood', emoji: '🪵', qty: 5, rarity: 'Common', sellPrice: 3, type: 'material' },
  },
  {
    id: 'stone_found',
    coins: 30,
    exp: 8,
    emoji: '🪨',
    rarity: 'Common',
    chance: 12,
    item: { id: 'stone', emoji: '🪨', qty: 4, rarity: 'Common', sellPrice: 2, type: 'material' },
  },
  {
    id: 'string_found',
    coins: 25,
    exp: 8,
    emoji: '🧵',
    rarity: 'Common',
    chance: 10,
    item: { id: 'string', emoji: '🧵', qty: 3, rarity: 'Common', sellPrice: 4, type: 'material' },
  },

  // UNCOMMON
  {
    id: 'forest_slime',
    coins: 200,
    exp: 30,
    emoji: '🟢',
    rarity: 'Uncommon',
    chance: 10,
  },
  {
    id: 'beehive',
    coins: 60,
    exp: 18,
    emoji: '🐝',
    rarity: 'Uncommon',
    chance: 7,
    item: {
      id: 'honey',
      emoji: '🍯',
      qty: 1,
      rarity: 'Uncommon',
      sellPrice: 30,
      type: 'consumable',
      effects: [{ type: 'heal', value: 15 }],
    },
  },
  {
    id: 'herb_found',
    coins: 70,
    exp: 20,
    emoji: '🌿',
    rarity: 'Uncommon',
    chance: 5,
    item: { id: 'herb', emoji: '🌿', qty: 1, rarity: 'Uncommon', sellPrice: 25, type: 'material' },
  },
  {
    id: 'bark_found',
    coins: 90,
    exp: 22,
    emoji: '🪵',
    rarity: 'Uncommon',
    chance: 3,
    item: { id: 'bark', emoji: '🪵', qty: 2, rarity: 'Uncommon', sellPrice: 18, type: 'material' },
  },
  {
    id: 'iron_vein',
    coins: 80,
    exp: 25,
    emoji: '⛏️',
    rarity: 'Uncommon',
    chance: 5,
    item: {
      id: 'iron_ore',
      emoji: '🪨',
      qty: 2,
      rarity: 'Uncommon',
      sellPrice: 12,
      type: 'material',
    },
  },
  {
    id: 'mythril_vein',
    coins: 150,
    exp: 40,
    emoji: '💜',
    rarity: 'Rare',
    chance: 2,
    item: {
      id: 'mythril_ore',
      emoji: '💜',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 45,
      type: 'material',
    },
  },

  // RARE
  {
    id: 'ancient_chest',
    coins: 500,
    exp: 50,
    emoji: '📦',
    rarity: 'Rare',
    chance: 6,
  },
  {
    id: 'mana_crystal_found',
    coins: 120,
    exp: 30,
    emoji: '🔷',
    rarity: 'Rare',
    chance: 4,
    item: {
      id: 'mana_crystal',
      emoji: '🔷',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 45,
      type: 'material',
    },
  },
  {
    id: 'moonflower_found',
    coins: 150,
    exp: 40,
    emoji: '🌸',
    rarity: 'Rare',
    chance: 2,
    item: {
      id: 'moonflower',
      emoji: '🌸',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 80,
      type: 'material',
    },
  },
  {
    id: 'monster_egg_found',
    coins: 200,
    exp: 50,
    emoji: '🥚',
    rarity: 'Rare',
    chance: 1,
    item: {
      id: 'monster_egg',
      emoji: '🥚',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 120,
      type: 'material',
    },
  },

  // EPIC
  {
    id: 'honey_altar',
    coins: 300,
    exp: 60,
    emoji: '🏰',
    rarity: 'Epic',
    chance: 3,
    item: {
      id: 'honey',
      emoji: '🍯',
      qty: 3,
      rarity: 'Uncommon',
      sellPrice: 30,
      type: 'consumable',
      effects: [{ type: 'heal', value: 15 }],
    },
  },
  {
    id: 'buried_treasure',
    coins: 800,
    exp: 100,
    emoji: '💎',
    rarity: 'Epic',
    chance: 2,
    item: {
      id: 'gold_nugget',
      emoji: '💎',
      qty: 1,
      rarity: 'Epic',
      sellPrice: 300,
      type: 'material',
    },
  },

  // LEGENDARY
  {
    id: 'ancient_ruins',
    coins: 1500,
    exp: 200,
    emoji: '👑',
    rarity: 'Legendary',
    chance: 2,
    item: {
      id: 'ancient_relic',
      emoji: '👑',
      qty: 1,
      rarity: 'Legendary',
      sellPrice: 1000,
      type: 'material',
    },
  },
];

export function rollExplore(): ExploreOutcome {
  const roll = Math.random() * 100;
  let cum = 0;
  for (const e of EXPLORES) {
    cum += e.chance;
    if (roll < cum) return e;
  }
  return EXPLORES[0];
}
