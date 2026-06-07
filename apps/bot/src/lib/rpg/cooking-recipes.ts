import type { IItemEffect, EquipmentSlot, IEquipmentStat } from '@nova/db';
import type { Rarity } from '../utils.ts';

export interface Ingredient {
  id: string;
  qty: number;
}

export interface Recipe {
  id: string;
  emoji: string;
  ingredients: Ingredient[];
  resultItemId: string;
  exp: number;
  levelReq?: number;
}

export interface CookedItem {
  itemId: string;
  emoji: string;
  rarity: Rarity;
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  slot?: EquipmentSlot;
  effects?: IItemEffect[];
  stats?: IEquipmentStat;
}

export const RECIPES: Recipe[] = [
  // === BASIC ===
  {
    id: 'fish_sardine',
    emoji: '🐟',
    ingredients: [{ id: 'fish_sardine', qty: 1 }],
    resultItemId: 'cooked_sardine',
    exp: 5,
  },
  {
    id: 'fish_mackerel',
    emoji: '🐟',
    ingredients: [{ id: 'fish_mackerel', qty: 1 }],
    resultItemId: 'cooked_mackerel',
    exp: 6,
  },
  {
    id: 'fish_tilapia',
    emoji: '🐠',
    ingredients: [{ id: 'fish_tilapia', qty: 1 }],
    resultItemId: 'cooked_tilapia',
    exp: 7,
  },
  {
    id: 'fish_salmon',
    emoji: '🍣',
    ingredients: [{ id: 'fish_salmon', qty: 1 }],
    resultItemId: 'cooked_salmon',
    exp: 10,
  },
  {
    id: 'fish_tuna',
    emoji: '🐟',
    ingredients: [{ id: 'fish_tuna', qty: 1 }],
    resultItemId: 'cooked_tuna',
    exp: 9,
  },
  {
    id: 'meat',
    emoji: '🥩',
    ingredients: [{ id: 'meat', qty: 1 }],
    resultItemId: 'cooked_meat',
    exp: 7,
  },
  {
    id: 'hide',
    emoji: '🦌',
    ingredients: [{ id: 'hide', qty: 1 }],
    resultItemId: 'hide_soup',
    exp: 4,
  },
  {
    id: 'wolf_meat',
    emoji: '🍖',
    ingredients: [{ id: 'wolf_meat', qty: 1 }],
    resultItemId: 'cooked_wolf',
    exp: 8,
  },
  {
    id: 'bear_meat',
    emoji: '🥩',
    ingredients: [{ id: 'bear_meat', qty: 1 }],
    resultItemId: 'cooked_bear',
    exp: 15,
  },
  {
    id: 'lizard_meat',
    emoji: '🍗',
    ingredients: [{ id: 'lizard_meat', qty: 1 }],
    resultItemId: 'cooked_lizard',
    exp: 6,
  },
  {
    id: 'honey',
    emoji: '🍯',
    ingredients: [{ id: 'honey', qty: 1 }],
    resultItemId: 'warm_honey',
    exp: 8,
  },

  // === BUFF BASIC ===
  {
    id: 'spicy_stew',
    emoji: '🌶️',
    ingredients: [
      { id: 'meat', qty: 2 },
      { id: 'chili', qty: 1 },
    ],
    resultItemId: 'spicy_stew',
    exp: 12,
  },
  {
    id: 'herbal_tea',
    emoji: '🍵',
    ingredients: [
      { id: 'herb', qty: 1 },
      { id: 'honey', qty: 1 },
    ],
    resultItemId: 'herbal_tea',
    exp: 10,
  },
  {
    id: 'mushroom_soup',
    emoji: '🍄',
    ingredients: [
      { id: 'mushroom', qty: 3 },
      { id: 'bark', qty: 1 },
    ],
    resultItemId: 'mushroom_soup',
    exp: 9,
  },
  {
    id: 'ginseng_brew',
    emoji: '🌱',
    ingredients: [{ id: 'honey', qty: 3 }],
    resultItemId: 'ginseng_brew',
    exp: 14,
  },
  {
    id: 'mana_potion',
    emoji: '🔷',
    ingredients: [
      { id: 'mana_crystal', qty: 1 },
      { id: 'herb', qty: 1 },
      { id: 'bark', qty: 1 },
    ],
    resultItemId: 'mana_potion',
    exp: 15,
  },
  {
    id: 'bark_tea',
    emoji: '🪵',
    ingredients: [
      { id: 'bark', qty: 2 },
      { id: 'mushroom', qty: 1 },
    ],
    resultItemId: 'bark_tea',
    exp: 7,
  },
  {
    id: 'moon_elixir',
    emoji: '🌸',
    ingredients: [
      { id: 'moonflower', qty: 1 },
      { id: 'mana_crystal', qty: 2 },
      { id: 'honey', qty: 2 },
    ],
    resultItemId: 'moon_elixir',
    exp: 20,
  },
  {
    id: 'golden_omelette',
    emoji: '🥚',
    ingredients: [
      { id: 'monster_egg', qty: 1 },
      { id: 'gold_nugget', qty: 1 },
      { id: 'bear_meat', qty: 1 },
    ],
    resultItemId: 'golden_omelette',
    exp: 25,
  },

  // === MID GAME ===
  {
    id: 'venom_soup',
    emoji: '🧪',
    ingredients: [
      { id: 'venom_sac', qty: 1 },
      { id: 'lizard_meat', qty: 1 },
    ],
    resultItemId: 'venom_soup',
    exp: 18,
  },
  {
    id: 'spider_silk_pie',
    emoji: '🕸️',
    ingredients: [
      { id: 'spider_silk', qty: 3 },
      { id: 'honey', qty: 1 },
    ],
    resultItemId: 'silk_pie',
    exp: 16,
  },
  {
    id: 'harpy_wings',
    emoji: '🦅',
    ingredients: [
      { id: 'feather', qty: 5 },
      { id: 'talon', qty: 2 },
    ],
    resultItemId: 'crispy_harpy',
    exp: 17,
  },
  {
    id: 'berserk_stew',
    emoji: '🩸',
    ingredients: [
      { id: 'berserk_blood', qty: 1 },
      { id: 'orc_tooth', qty: 3 },
      { id: 'bear_meat', qty: 1 },
    ],
    resultItemId: 'berserk_stew',
    exp: 22,
  },
  {
    id: 'shadow_curry',
    emoji: '🐆',
    ingredients: [
      { id: 'panther_pelt', qty: 2 },
      { id: 'night_essence', qty: 1 },
    ],
    resultItemId: 'shadow_curry',
    exp: 24,
  },
  {
    id: 'lava_jelly',
    emoji: '🟠',
    ingredients: [
      { id: 'magma_jelly', qty: 2 },
      { id: 'core_lava', qty: 1 },
    ],
    resultItemId: 'lava_jelly',
    exp: 20,
  },

  // === LATE GAME ===
  {
    id: 'troll_ragout',
    emoji: '🧌',
    ingredients: [
      { id: 'troll_fat', qty: 2 },
      { id: 'frost_heart', qty: 1 },
    ],
    resultItemId: 'troll_ragout',
    exp: 28,
  },
  {
    id: 'worm_sushi',
    emoji: '🪱',
    ingredients: [
      { id: 'worm_meat', qty: 2 },
      { id: 'sand_pearl', qty: 1 },
    ],
    resultItemId: 'worm_sushi',
    exp: 30,
  },
  {
    id: 'dark_knight_feast',
    emoji: '🗡️',
    ingredients: [
      { id: 'dark_steel', qty: 1 },
      { id: 'void_essence', qty: 1 },
      { id: 'bear_meat', qty: 2 },
    ],
    resultItemId: 'knight_feast',
    exp: 35,
  },
  {
    id: 'storm_broth',
    emoji: '⚡',
    ingredients: [
      { id: 'storm_feather', qty: 3 },
      { id: 'thunder_egg', qty: 1 },
    ],
    resultItemId: 'storm_broth',
    exp: 38,
  },
  {
    id: 'crystal_soup',
    emoji: '💎',
    ingredients: [
      { id: 'crystal_shard', qty: 5 },
      { id: 'prism', qty: 1 },
      { id: 'diamond_heart', qty: 1 },
    ],
    resultItemId: 'crystal_soup',
    exp: 45,
  },

  // === END GAME ===
  {
    id: 'hydra_gumbo',
    emoji: '🐉',
    ingredients: [
      { id: 'hydra_scale', qty: 3 },
      { id: 'hydra_head', qty: 1 },
      { id: 'venom_blood', qty: 1 },
    ],
    resultItemId: 'hydra_gumbo',
    exp: 55,
  },
  {
    id: 'phoenix_rebirth',
    emoji: '🔥',
    ingredients: [
      { id: 'phoenix_tear', qty: 1 },
      { id: 'rebirth_egg', qty: 1 },
      { id: 'flame_talon', qty: 2 },
    ],
    resultItemId: 'phoenix_rebirth',
    exp: 65,
  },

  // === DUNGEON SPECIALS ===
  {
    id: 'slime_jelly',
    emoji: '🟢',
    ingredients: [
      { id: 'slime_core', qty: 2 },
      { id: 'gooey_jelly', qty: 1 },
    ],
    resultItemId: 'slime_jelly',
    exp: 12,
  },
  {
    id: 'void_soup',
    emoji: '🌫️',
    ingredients: [
      { id: 'void_essence', qty: 2 },
      { id: 'ectoplasm', qty: 3 },
    ],
    resultItemId: 'void_soup',
    exp: 50,
  },
  {
    id: 'drake_flame_grill',
    emoji: '🐲',
    ingredients: [
      { id: 'drake_scale', qty: 4 },
      { id: 'charred_bone', qty: 1 },
    ],
    resultItemId: 'drake_grill',
    exp: 60,
  },
];

export const getRecipe = (id: string) => RECIPES.find((r) => r.id === id);

// === ITEM DEFINITIONS FOR DB SEED ===
export const COOKED_ITEMS: CookedItem[] = [
  {
    itemId: 'cooked_sardine',
    emoji: '🐟',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 8,
    effects: [{ type: 'heal', value: 20 }],
  },
  {
    itemId: 'cooked_mackerel',
    emoji: '🐟',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 10,
    effects: [{ type: 'heal', value: 25 }],
  },
  {
    itemId: 'cooked_tilapia',
    emoji: '🐠',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 12,
    effects: [{ type: 'heal', value: 30 }],
  },
  {
    itemId: 'cooked_salmon',
    emoji: '🍣',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 20,
    effects: [{ type: 'heal', value: 45 }],
  },
  {
    itemId: 'cooked_tuna',
    emoji: '🐟',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 18,
    effects: [{ type: 'heal', value: 40 }],
  },
  {
    itemId: 'cooked_meat',
    emoji: '🥩',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 12,
    effects: [{ type: 'heal', value: 30 }],
  },
  {
    itemId: 'hide_soup',
    emoji: '🦌',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 6,
    effects: [{ type: 'heal', value: 15 }],
  },
  {
    itemId: 'cooked_wolf',
    emoji: '🍖',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 14,
    effects: [{ type: 'heal', value: 35 }],
  },
  {
    itemId: 'cooked_bear',
    emoji: '🥩',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 35,
    effects: [{ type: 'heal', value: 70 }],
  },
  {
    itemId: 'cooked_lizard',
    emoji: '🍗',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 10,
    effects: [{ type: 'heal', value: 25 }],
  },
  {
    itemId: 'warm_honey',
    emoji: '🍯',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 18,
    effects: [{ type: 'heal', value: 40 }],
  },
  {
    itemId: 'spicy_stew',
    emoji: '🌶️',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 25,
    effects: [
      { type: 'heal', value: 40 },
      { type: 'buff', value: 0.05 },
    ],
  },
  {
    itemId: 'herbal_tea',
    emoji: '🍵',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 15,
    effects: [
      { type: 'heal', value: 25 },
      { type: 'buff', value: 0.02 },
    ],
  },
  {
    itemId: 'mushroom_soup',
    emoji: '🍄',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 14,
    effects: [{ type: 'heal', value: 35 }],
  },
  {
    itemId: 'ginseng_brew',
    emoji: '🌱',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 30,
    effects: [
      { type: 'heal', value: 50 },
      { type: 'buff', value: 0.03 },
    ],
  },
  {
    itemId: 'mana_potion',
    emoji: '🔷',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 28,
    effects: [
      { type: 'heal', value: 15 },
      { type: 'buff', value: 0.08 },
    ],
  },
  {
    itemId: 'bark_tea',
    emoji: '🪵',
    type: 'consumable',
    rarity: 'Common',
    sellPrice: 8,
    effects: [{ type: 'heal', value: 20 }],
  },
  {
    itemId: 'moon_elixir',
    emoji: '🌸',
    type: 'consumable',
    rarity: 'Epic',
    sellPrice: 60,
    effects: [
      { type: 'heal', value: 80 },
      { type: 'buff', value: 0.12 },
    ],
  },
  {
    itemId: 'golden_omelette',
    emoji: '🥚',
    type: 'consumable',
    rarity: 'Epic',
    sellPrice: 80,
    effects: [
      { type: 'heal', value: 100 },
      { type: 'buff', value: 0.15 },
    ],
  },
  {
    itemId: 'venom_soup',
    emoji: '🧪',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 30,
    effects: [
      { type: 'heal', value: 45 },
      { type: 'buff', value: 0.04 },
    ],
  },
  {
    itemId: 'silk_pie',
    emoji: '🕸️',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 25,
    effects: [{ type: 'heal', value: 55 }],
  },
  {
    itemId: 'crispy_harpy',
    emoji: '🦅',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 28,
    effects: [{ type: 'heal', value: 60 }],
  },
  {
    itemId: 'berserk_stew',
    emoji: '🩸',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 45,
    effects: [
      { type: 'heal', value: 75 },
      { type: 'buff', value: 0.1 },
    ],
  },
  {
    itemId: 'shadow_curry',
    emoji: '🐆',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 48,
    effects: [
      { type: 'heal', value: 80 },
      { type: 'buff', value: 0.05 },
    ],
  },
  {
    itemId: 'lava_jelly',
    emoji: '🟠',
    type: 'consumable',
    rarity: 'Rare',
    sellPrice: 35,
    effects: [{ type: 'heal', value: 65 }],
  },
  {
    itemId: 'troll_ragout',
    emoji: '🧌',
    type: 'consumable',
    rarity: 'Epic',
    sellPrice: 55,
    effects: [{ type: 'heal', value: 95 }],
  },
  {
    itemId: 'worm_sushi',
    emoji: '🪱',
    type: 'consumable',
    rarity: 'Epic',
    sellPrice: 65,
    effects: [{ type: 'heal', value: 110 }],
  },
  {
    itemId: 'knight_feast',
    emoji: '🗡️',
    type: 'consumable',
    rarity: 'Epic',
    sellPrice: 85,
    effects: [
      { type: 'heal', value: 125 },
      { type: 'buff', value: 0.18 },
    ],
  },
  {
    itemId: 'storm_broth',
    emoji: '⚡',
    type: 'consumable',
    rarity: 'Legendary',
    sellPrice: 100,
    effects: [
      { type: 'heal', value: 140 },
      { type: 'buff', value: 0.07 },
    ],
  },
  {
    itemId: 'crystal_soup',
    emoji: '💎',
    type: 'consumable',
    rarity: 'Legendary',
    sellPrice: 120,
    effects: [{ type: 'heal', value: 160 }],
  },
  {
    itemId: 'hydra_gumbo',
    emoji: '🐉',
    type: 'consumable',
    rarity: 'Legendary',
    sellPrice: 180,
    effects: [
      { type: 'heal', value: 200 },
      { type: 'buff', value: 0.25 },
    ],
  },
  {
    itemId: 'phoenix_rebirth',
    emoji: '🔥',
    type: 'consumable',
    rarity: 'Mythic',
    sellPrice: 250,
    effects: [
      { type: 'heal', value: 250 },
      { type: 'buff', value: 0.3 },
    ],
  },
  {
    itemId: 'slime_jelly',
    emoji: '🟢',
    type: 'consumable',
    rarity: 'Uncommon',
    sellPrice: 16,
    effects: [{ type: 'heal', value: 35 }],
  },
  {
    itemId: 'void_soup',
    emoji: '🌫️',
    type: 'consumable',
    rarity: 'Legendary',
    sellPrice: 150,
    effects: [
      { type: 'heal', value: 180 },
      { type: 'buff', value: 0.08 },
    ],
  },
  {
    itemId: 'drake_grill',
    emoji: '🐲',
    type: 'consumable',
    rarity: 'Mythic',
    sellPrice: 200,
    effects: [
      { type: 'heal', value: 220 },
      { type: 'buff', value: 0.22 },
    ],
  },
];
