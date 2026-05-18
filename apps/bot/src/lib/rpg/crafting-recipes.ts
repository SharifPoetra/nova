export interface CraftingIngredient {
  id: string;
  qty: number;
}
export interface CraftingRecipe {
  id: string;
  name: string;
  emoji: string;
  result: { itemId: string; qty: number };
  ingredients: CraftingIngredient[];
  requiredLevel?: number;
  category: 'tool' | 'weapon' | 'armor';
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_wooden_rod',
    name: 'Wooden Fishing Rod',
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
    id: 'craft_iron_rod',
    name: 'Iron Fishing Rod',
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
    id: 'craft_mythril_rod',
    name: 'Mythril Fishing Rod',
    emoji: '✨🎣',
    category: 'tool',
    result: { itemId: 'mythril_rod', qty: 1 },
    ingredients: [
      { id: 'mythril_ore', qty: 8 },
      { id: 'silk', qty: 5 },
      { id: 'mana_crystal', qty: 2 },
    ],
    requiredLevel: 15,
  },
  {
    id: 'craft_stone_pickaxe',
    name: 'Stone Pickaxe',
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
    id: 'craft_iron_pickaxe',
    name: 'Iron Pickaxe',
    emoji: '⛏️',
    category: 'tool',
    result: { itemId: 'iron_pickaxe', qty: 1 },
    ingredients: [
      { id: 'iron_ore', qty: 15 },
      { id: 'wood', qty: 8 },
    ],
    requiredLevel: 5,
  },
];

export const getCraftingRecipe = (id: string) => CRAFTING_RECIPES.find((r) => r.id === id);
