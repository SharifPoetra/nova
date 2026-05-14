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

  // === BUFF BASIC ===
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
      { id: 'bark', qty: 1 },
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

  // === MID GAME (lv5-10) ===
  {
    id: 'venom_soup',
    heal: 45,
    name: 'Venom Soup',
    emoji: '🧪',
    ingredients: [
      { id: 'venom_sac', qty: 1 },
      { id: 'lizard_meat', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 4, duration: 3600000 },
  },
  {
    id: 'spider_silk_pie',
    heal: 55,
    name: 'Silk Pie',
    emoji: '🕸️',
    ingredients: [
      { id: 'spider_silk', qty: 3 },
      { id: 'honey', qty: 1 },
    ],
  },
  {
    id: 'harpy_wings',
    heal: 60,
    name: 'Crispy Harpy',
    emoji: '🦅',
    ingredients: [
      { id: 'feather', qty: 5 },
      { id: 'talon', qty: 2 },
    ],
  },
  {
    id: 'berserk_stew',
    heal: 75,
    name: 'Berserk Stew',
    emoji: '🩸',
    ingredients: [
      { id: 'berserk_blood', qty: 1 },
      { id: 'orc_tooth', qty: 3 },
      { id: 'bear_meat', qty: 1 },
    ],
    buff: { type: 'atk', value: 10, duration: 5400000 },
  },
  {
    id: 'shadow_curry',
    heal: 80,
    name: 'Shadow Curry',
    emoji: '🐆',
    ingredients: [
      { id: 'panther_pelt', qty: 2 },
      { id: 'night_essence', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 5, duration: 3600000 },
  },
  {
    id: 'lava_jelly',
    heal: 65,
    name: 'Lava Jelly',
    emoji: '🟠',
    ingredients: [
      { id: 'magma_jelly', qty: 2 },
      { id: 'core_lava', qty: 1 },
    ],
  },

  // === LATE GAME (lv11-20) ===
  {
    id: 'troll_ragout',
    heal: 95,
    name: 'Troll Ragout',
    emoji: '🧌',
    ingredients: [
      { id: 'troll_fat', qty: 2 },
      { id: 'frost_heart', qty: 1 },
    ],
  },
  {
    id: 'worm_sushi',
    heal: 110,
    name: 'Worm Sushi',
    emoji: '🪱',
    ingredients: [
      { id: 'worm_meat', qty: 2 },
      { id: 'sand_pearl', qty: 1 },
    ],
  },
  {
    id: 'dark_knight_feast',
    heal: 125,
    name: 'Knight Feast',
    emoji: '🗡️',
    ingredients: [
      { id: 'dark_steel', qty: 1 },
      { id: 'void_essence', qty: 1 },
      { id: 'bear_meat', qty: 2 },
    ],
    buff: { type: 'atk', value: 18, duration: 7200000 },
  },
  {
    id: 'storm_broth',
    heal: 140,
    name: 'Storm Broth',
    emoji: '⚡',
    ingredients: [
      { id: 'storm_feather', qty: 3 },
      { id: 'thunder_egg', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 7, duration: 5400000 },
  },
  {
    id: 'crystal_soup',
    heal: 160,
    name: 'Crystal Soup',
    emoji: '💎',
    ingredients: [
      { id: 'crystal_shard', qty: 5 },
      { id: 'prism', qty: 1 },
      { id: 'diamond_heart', qty: 1 },
    ],
  },

  // === END GAME (lv22+) ===
  {
    id: 'hydra_gumbo',
    heal: 200,
    name: 'Hydra Gumbo',
    emoji: '🐉',
    ingredients: [
      { id: 'hydra_scale', qty: 3 },
      { id: 'hydra_head', qty: 1 },
      { id: 'venom_blood', qty: 1 },
    ],
    buff: { type: 'atk', value: 25, duration: 10800000 },
  },
  {
    id: 'phoenix_rebirth',
    heal: 250,
    name: 'Phoenix Rebirth',
    emoji: '🔥',
    ingredients: [
      { id: 'phoenix_tear', qty: 1 },
      { id: 'rebirth_egg', qty: 1 },
      { id: 'flame_talon', qty: 2 },
    ],
    buff: { type: 'atk', value: 30, duration: 14400000 },
  },

  // === DUNGEON SPECIALS ===
  {
    id: 'slime_jelly',
    heal: 35,
    name: 'Slime Jelly',
    emoji: '🟢',
    ingredients: [
      { id: 'slime_core', qty: 2 },
      { id: 'gooey_jelly', qty: 1 },
    ],
  },
  {
    id: 'void_soup',
    heal: 180,
    name: 'Void Soup',
    emoji: '🌫️',
    ingredients: [
      { id: 'void_essence', qty: 2 },
      { id: 'soul_wisp', qty: 1 },
      { id: 'ectoplasm', qty: 3 },
    ],
    buff: { type: 'stamina_regen', value: 8, duration: 7200000 },
  },
  {
    id: 'drake_flame_grill',
    heal: 220,
    name: 'Drake Flame Grill',
    emoji: '🐲',
    ingredients: [
      { id: 'drake_scale', qty: 4 },
      { id: 'drake_claw', qty: 2 },
      { id: 'charred_bone', qty: 1 },
    ],
    buff: { type: 'atk', value: 22, duration: 10800000 },
  },
];

export const getRecipe = (id: string) => RECIPES.find((r) => r.id === id);
