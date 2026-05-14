import type { Rarity } from '../utils';

export interface ExploreItem {
  id: string;
  name: string;
  emoji: string;
  qty: number;
  rarity: Rarity;
  sellPrice: number;
  type: 'material' | 'consumable';
  description: string;
  effects?: { type: 'heal' | 'stamina' | 'mana' | 'buff'; value: number }[];
}

export interface ExploreOutcome {
  text: string;
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
    text: 'Kabut tebal, kamu hanya dapat pengalaman.',
    coins: 30,
    exp: 25,
    emoji: '🌫️',
    rarity: 'Common',
    chance: 20,
  },
  {
    text: 'Koin emas di akar pohon.',
    coins: 100,
    exp: 20,
    emoji: '✨',
    rarity: 'Common',
    chance: 15,
  },
  {
    text: 'Kamu memetik jamur hutan.',
    coins: 40,
    exp: 12,
    emoji: '🍄',
    rarity: 'Common',
    chance: 10,
    item: {
      id: 'mushroom',
      name: 'Jamur Hutan',
      emoji: '🍄',
      qty: 3,
      rarity: 'Common',
      sellPrice: 8,
      type: 'material',
      description: 'Jamur liar, bahan dasar sup jamur',
    },
  },
  {
    text: 'Semak cabai liar ditemukan!',
    coins: 50,
    exp: 15,
    emoji: '🌶️',
    rarity: 'Common',
    chance: 10,
    item: {
      id: 'chili',
      name: 'Cabai Liar',
      emoji: '🌶️',
      qty: 2,
      rarity: 'Common',
      sellPrice: 15,
      type: 'material',
      description: 'Pedas menyengat, untuk spicy stew',
    },
  },

  // UNCOMMON
  {
    text: 'Slime hutan kamu tebas!',
    coins: 200,
    exp: 30,
    emoji: '🟢',
    rarity: 'Uncommon',
    chance: 10,
  },
  {
    text: 'Sarang lebah kecil jatuh dari pohon.',
    coins: 60,
    exp: 18,
    emoji: '🐝',
    rarity: 'Uncommon',
    chance: 7,
    item: {
      id: 'honey',
      name: 'Madu Liar',
      emoji: '🍯',
      qty: 1,
      rarity: 'Uncommon',
      sellPrice: 30,
      type: 'consumable',
      description: 'Madu hutan manis, +15 HP',
      effects: [{ type: 'heal', value: 15 }],
    },
  },
  {
    text: 'Daun herbal berkilau di rawa.',
    coins: 70,
    exp: 20,
    emoji: '🌿',
    rarity: 'Uncommon',
    chance: 5,
    item: {
      id: 'herb',
      name: 'Daun Herbal',
      emoji: '🌿',
      qty: 1,
      rarity: 'Uncommon',
      sellPrice: 25,
      type: 'material',
      description: 'Daun obat, bahan herbal tea',
    },
  },
  {
    text: 'Kulit kayu kuno untuk ramuan.',
    coins: 90,
    exp: 22,
    emoji: '🪵',
    rarity: 'Uncommon',
    chance: 3,
    item: {
      id: 'bark',
      name: 'Kulit Kayu',
      emoji: '🪵',
      qty: 2,
      rarity: 'Uncommon',
      sellPrice: 18,
      type: 'material',
      description: 'Kulit pohon tua untuk ramuan mana',
    },
  },

  // RARE
  {
    text: 'Peti kuno berdebu terbuka!',
    coins: 500,
    exp: 50,
    emoji: '📦',
    rarity: 'Rare',
    chance: 6,
  },
  {
    text: 'Kristal mana kecil bersinar.',
    coins: 120,
    exp: 30,
    emoji: '🔷',
    rarity: 'Rare',
    chance: 4,
    item: {
      id: 'mana_crystal',
      name: 'Kristal Mana',
      emoji: '🔷',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 45,
      type: 'material',
      description: 'Kristal biru berisi energi sihir',
    },
  },
  {
    text: 'Kamu menemukan bunga moonlight langka!',
    coins: 150,
    exp: 40,
    emoji: '🌸',
    rarity: 'Rare',
    chance: 2,
    item: {
      id: 'moonflower',
      name: 'Moonflower',
      emoji: '🌸',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 80,
      type: 'material',
      description: 'Bunga yang mekar hanya saat bulan purnama',
    },
  },
  {
    text: 'Telur monster kecil masih hangat.',
    coins: 200,
    exp: 50,
    emoji: '🥚',
    rarity: 'Rare',
    chance: 1,
    item: {
      id: 'monster_egg',
      name: 'Telur Monster',
      emoji: '🥚',
      qty: 1,
      rarity: 'Rare',
      sellPrice: 120,
      type: 'material',
      description: 'Telur langka untuk golden omelette',
    },
  },

  // EPIC
  {
    text: 'DUNGEON! Altar madu suci.',
    coins: 300,
    exp: 60,
    emoji: '🏰',
    rarity: 'Epic',
    chance: 3,
    item: {
      id: 'honey',
      name: 'Madu Liar',
      emoji: '🍯',
      qty: 3,
      rarity: 'Uncommon',
      sellPrice: 30,
      type: 'consumable',
      description: 'Madu hutan manis, +15 HP',
      effects: [{ type: 'heal', value: 15 }],
    },
  },
  {
    text: 'HARTA KARUN! Peti emas terkubur!',
    coins: 800,
    exp: 100,
    emoji: '💎',
    rarity: 'Epic',
    chance: 2,
    item: {
      id: 'gold_nugget',
      name: 'Bongkah Emas',
      emoji: '💎',
      qty: 1,
      rarity: 'Epic',
      sellPrice: 300,
      type: 'material',
      description: 'Emas murni untuk craft tingkat tinggi',
    },
  },

  // LEGENDARY
  {
    text: 'Kamu menemukan reruntuhan kuno dewa!',
    coins: 1500,
    exp: 200,
    emoji: '👑',
    rarity: 'Legendary',
    chance: 2,
    item: {
      id: 'ancient_relic',
      name: 'Relik Kuno',
      emoji: '👑',
      qty: 1,
      rarity: 'Legendary',
      sellPrice: 1000,
      type: 'material',
      description: 'Artefak dewa yang hilang',
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
