import type { Rarity } from '../utils';

export interface ExploreItem {
  id: string;
  name: string;
  emoji: string;
  qty: number;
  rarity: Rarity;
  sell: number;
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
  // COMMON - total 55%
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
    item: { id: 'mushroom', name: 'Jamur Hutan', emoji: '🍄', qty: 3, rarity: 'Common', sell: 8 },
  },
  {
    text: 'Semak cabai liar ditemukan!',
    coins: 50,
    exp: 15,
    emoji: '🌶️',
    rarity: 'Common',
    chance: 10,
    item: { id: 'chili', name: 'Cabai Liar', emoji: '🌶️', qty: 2, rarity: 'Common', sell: 15 },
  },

  // UNCOMMON - total 25%
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
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 1, rarity: 'Common', sell: 30 },
  },
  {
    text: 'Daun herbal berkilau di rawa.',
    coins: 70,
    exp: 20,
    emoji: '🌿',
    rarity: 'Uncommon',
    chance: 5,
    item: { id: 'herb', name: 'Daun Herbal', emoji: '🌿', qty: 1, rarity: 'Uncommon', sell: 25 },
  },
  {
    text: 'Kulit kayu kuno untuk ramuan.',
    coins: 90,
    exp: 22,
    emoji: '🪵',
    rarity: 'Uncommon',
    chance: 3,
    item: { id: 'bark', name: 'Kulit Kayu', emoji: '🪵', qty: 2, rarity: 'Uncommon', sell: 18 },
  },

  // RARE - total 13%
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
      rarity: 'Uncommon',
      sell: 45,
    },
  },
  {
    text: 'Kamu menemukan bunga moonlight langka!',
    coins: 150,
    exp: 40,
    emoji: '🌸',
    rarity: 'Rare',
    chance: 2,
    item: { id: 'moonflower', name: 'Moonflower', emoji: '🌸', qty: 1, rarity: 'Rare', sell: 80 },
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
      sell: 120,
    },
  },

  // EPIC - total 5%
  {
    text: 'DUNGEON! Peti berisi madu hutan.',
    coins: 300,
    exp: 60,
    emoji: '🏰',
    rarity: 'Epic',
    chance: 3,
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 2, rarity: 'Uncommon', sell: 30 },
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
      sell: 300,
    },
  },

  // LEGENDARY - total 2%
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
      sell: 1000,
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
  return EXPLORES[0]; // fallback
}
