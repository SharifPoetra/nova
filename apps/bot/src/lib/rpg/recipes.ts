export interface Ingredient {
  id: string;
  qty: number;
}
export interface RecipeBuff {
  type: 'atk' | 'stamina_regen';
  value: number;
  duration: number;
}
export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  heal: number;
  ingredients: Ingredient[];
  buff?: RecipeBuff | null;
}

export const RECIPES: Recipe[] = [
  // === BASIC ===
  {
    id: 'fish_sardine',
    heal: 20,
    name: 'Sarden Bakar',
    emoji: '🐟',
    ingredients: [{ id: 'fish_sardine', qty: 1 }],
  },
  {
    id: 'fish_mackerel',
    heal: 25,
    name: 'Kembung Goreng',
    emoji: '🐟',
    ingredients: [{ id: 'fish_mackerel', qty: 1 }],
  },
  {
    id: 'fish_tilapia',
    heal: 30,
    name: 'Nila Bakar',
    emoji: '🐠',
    ingredients: [{ id: 'fish_tilapia', qty: 1 }],
  },
  {
    id: 'fish_salmon',
    heal: 45,
    name: 'Salmon Panggang',
    emoji: '🍣',
    ingredients: [{ id: 'fish_salmon', qty: 1 }],
  },
  {
    id: 'fish_tuna',
    heal: 40,
    name: 'Tuna Steak',
    emoji: '🐟',
    ingredients: [{ id: 'fish_tuna', qty: 1 }],
  },
  {
    id: 'meat',
    heal: 30,
    name: 'Steak Daging',
    emoji: '🥩',
    ingredients: [{ id: 'meat', qty: 1 }],
  },
  { id: 'hide', heal: 15, name: 'Sup Kulit', emoji: '🦌', ingredients: [{ id: 'hide', qty: 1 }] },
  {
    id: 'wolf_meat',
    heal: 35,
    name: 'Steak Serigala',
    emoji: '🍖',
    ingredients: [{ id: 'wolf_meat', qty: 1 }],
  },
  {
    id: 'bear_meat',
    heal: 70,
    name: 'Bear Steak',
    emoji: '🥩',
    ingredients: [{ id: 'bear_meat', qty: 1 }],
  },
  {
    id: 'lizard_meat',
    heal: 25,
    name: 'Sate Kadal',
    emoji: '🍗',
    ingredients: [{ id: 'lizard_meat', qty: 1 }],
  },
  {
    id: 'honey',
    heal: 40,
    name: 'Madu Hangat',
    emoji: '🍯',
    ingredients: [{ id: 'honey', qty: 1 }],
  },

  // === BUFF ===
  {
    id: 'spicy_stew',
    heal: 40,
    name: 'Spicy Stew',
    emoji: '🌶️',
    ingredients: [
      { id: 'meat', qty: 2 },
      { id: 'chili', qty: 1 },
    ],
    buff: { type: 'atk', value: 5, duration: 3600000 },
  },
  {
    id: 'herbal_tea',
    heal: 25,
    name: 'Herbal Tea',
    emoji: '🍵',
    ingredients: [
      { id: 'herb', qty: 1 },
      { id: 'honey', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 2, duration: 1800000 },
  },
  {
    id: 'mushroom_soup',
    heal: 35,
    name: 'Sup Jamur',
    emoji: '🍄',
    ingredients: [
      { id: 'mushroom', qty: 3 },
      { id: 'root', qty: 1 },
    ],
  },
  {
    id: 'ginseng_brew',
    heal: 50,
    name: 'Ginseng Brew',
    emoji: '🌱',
    ingredients: [
      { id: 'root', qty: 2 },
      { id: 'honey', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 3, duration: 3600000 },
  },
  {
    id: 'mana_potion',
    heal: 15,
    name: 'Mana Potion',
    emoji: '🔷',
    ingredients: [
      { id: 'mana_crystal', qty: 1 },
      { id: 'herb', qty: 1 },
      { id: 'bark', qty: 1 },
    ],
    buff: { type: 'atk', value: 8, duration: 1800000 },
  },
  {
    id: 'bark_tea',
    heal: 20,
    name: 'Bark Tea',
    emoji: '🪵',
    ingredients: [
      { id: 'bark', qty: 2 },
      { id: 'mushroom', qty: 1 },
    ],
  },
  {
    id: 'moon_elixir',
    heal: 80,
    name: 'Moon Elixir',
    emoji: '🌸',
    ingredients: [
      { id: 'moonflower', qty: 1 },
      { id: 'mana_crystal', qty: 2 },
      { id: 'honey', qty: 2 },
    ],
    buff: { type: 'atk', value: 12, duration: 3600000 },
  },
  {
    id: 'golden_omelette',
    heal: 100,
    name: 'Golden Omelette',
    emoji: '🥚',
    ingredients: [
      { id: 'monster_egg', qty: 1 },
      { id: 'gold_nugget', qty: 1 },
      { id: 'bear_meat', qty: 1 },
    ],
    buff: { type: 'atk', value: 15, duration: 7200000 },
  },
];

export const getRecipe = (id: string) => RECIPES.find((r) => r.id === id);
