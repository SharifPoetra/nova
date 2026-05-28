import type { EquipmentSlot } from '@nova/db';

export interface CraftingIngredient {
  id: string;
  qty: number;
}

export interface CraftingRecipe {
  id: string;
  emoji: string;
  result: { itemId: string; qty: number };
  ingredients: CraftingIngredient[];
  requiredLevel?: number;
  category: EquipmentSlot;
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_wooden_rod',
    emoji: '🎣',
    category: 'tool',
    result: { itemId: 'wooden_rod', qty: 1 },
    ingredients: [
      { id: 'wood', qty: 10 },
      { id: 'string', qty: 5 },
    ],
    requiredLevel: 1,
  },
  {
    id: 'craft_stone_pickaxe',
    emoji: '⛏️',
    category: 'tool',
    result: { itemId: 'stone_pickaxe', qty: 1 },
    ingredients: [
      { id: 'stone', qty: 15 },
      { id: 'wood', qty: 5 },
    ],
    requiredLevel: 1,
  },
  {
    id: 'craft_hunter_bow',
    emoji: '🏹',
    category: 'weapon',
    result: { itemId: 'hunter_bow', qty: 1 },
    ingredients: [
      { id: 'wood', qty: 12 },
      { id: 'string', qty: 6 },
      { id: 'feather', qty: 4 },
    ],
    requiredLevel: 3,
  },
  {
    id: 'craft_iron_sword',
    emoji: '⚔️',
    category: 'weapon',
    result: { itemId: 'iron_sword', qty: 1 },
    ingredients: [
      { id: 'iron_ore', qty: 10 },
      { id: 'wood', qty: 5 },
    ],
    requiredLevel: 4,
  },
  {
    id: 'craft_mage_staff',
    emoji: '🪄',
    category: 'weapon',
    result: { itemId: 'mage_staff', qty: 1 },
    ingredients: [
      { id: 'wood', qty: 8 },
      { id: 'mana_crystal', qty: 1 },
      { id: 'herb', qty: 2 },
    ],
    requiredLevel: 4,
  },
  {
    id: 'craft_iron_rod',
    emoji: '🎣',
    category: 'tool',
    result: { itemId: 'iron_rod', qty: 1 },
    ingredients: [
      { id: 'iron_ore', qty: 12 },
      { id: 'wood', qty: 8 },
      { id: 'string', qty: 8 },
    ],
    requiredLevel: 5,
  },
  {
    id: 'craft_iron_pickaxe',
    emoji: '⛏️',
    category: 'tool',
    result: { itemId: 'iron_pickaxe', qty: 1 },
    ingredients: [
      { id: 'iron_ore', qty: 15 },
      { id: 'wood', qty: 8 },
    ],
    requiredLevel: 5,
  },
  {
    id: 'craft_forager_bag',
    emoji: '🎒',
    category: 'tool',
    result: { itemId: 'forager_bag', qty: 1 },
    ingredients: [
      { id: 'hide', qty: 8 },
      { id: 'string', qty: 10 },
      { id: 'herb', qty: 3 },
    ],
    requiredLevel: 6,
  },
  {
    id: 'craft_mythril_rod',
    emoji: '✨🎣',
    category: 'tool',
    result: { itemId: 'mythril_rod', qty: 1 },
    ingredients: [
      { id: 'mythril_ore', qty: 8 },
      { id: 'spider_silk', qty: 5 },
      { id: 'mana_crystal', qty: 2 },
    ],
    requiredLevel: 15,
  },
  {
    id: 'craft_mythril_pickaxe',
    emoji: '✨⛏️',
    category: 'tool',
    result: { itemId: 'mythril_pickaxe', qty: 1 },
    ingredients: [
      { id: 'mythril_ore', qty: 10 },
      { id: 'wood', qty: 10 },
      { id: 'mana_crystal', qty: 1 },
    ],
    requiredLevel: 15,
  },
  {
    id: 'craft_star_blade',
    emoji: '⚔️⭐',
    category: 'weapon',
    result: { itemId: 'star_blade', qty: 1 },
    ingredients: [
      { id: 'iron_ore', qty: 15 },
      { id: 'star_dust', qty: 5 },
      { id: 'crystal_shard', qty: 3 },
    ],
    requiredLevel: 18,
  },
  {
    id: 'craft_inferno_staff',
    emoji: '🔥',
    category: 'weapon',
    result: { itemId: 'inferno_staff', qty: 1 },
    ingredients: [
      { id: 'mage_staff', qty: 1 },
      { id: 'fire_crystal', qty: 3 },
      { id: 'magma_jelly', qty: 5 },
      { id: 'berserk_blood', qty: 2 },
    ],
    requiredLevel: 22,
  },
  {
    id: 'craft_void_crown',
    emoji: '👑🌫️',
    category: 'helmet',
    result: { itemId: 'void_crown', qty: 1 },
    ingredients: [
      { id: 'void_essence', qty: 3 },
      { id: 'dark_steel', qty: 5 },
      { id: 'soul_shard', qty: 2 },
    ],
    requiredLevel: 20,
  },
  {
    id: 'craft_abyssal_rod',
    emoji: '🌊🎣',
    category: 'tool',
    result: { itemId: 'abyssal_rod', qty: 1 },
    ingredients: [
      { id: 'mythril_ore', qty: 12 },
      { id: 'ancient_relic', qty: 1 },
      { id: 'prism', qty: 2 },
    ],
    requiredLevel: 25,
  },
];

export const getCraftingRecipe = (id: string) => CRAFTING_RECIPES.find((r) => r.id === id);
