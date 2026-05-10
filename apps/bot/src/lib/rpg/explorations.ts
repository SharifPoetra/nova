import type { Rarity } from '../constants';

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
  item?: ExploreItem;
}

export const EXPLORES: ExploreOutcome[] = [
  // TANPA ITEM
  { text: 'Peti kuno berdebu terbuka!', coins: 500, exp: 50, emoji: '📦', rarity: 'Rare' },
  { text: 'Slime hutan kamu tebas!', coins: 200, exp: 30, emoji: '🟢', rarity: 'Uncommon' },
  { text: 'Koin emas di akar pohon.', coins: 100, exp: 20, emoji: '✨', rarity: 'Common' },
  {
    text: 'Kabut tebal, kamu hanya dapat pengalaman.',
    coins: 30,
    exp: 25,
    emoji: '🌫️',
    rarity: 'Common',
  },

  // COMMON
  {
    text: 'Semak cabai liar ditemukan!',
    coins: 50,
    exp: 15,
    emoji: '🌶️',
    rarity: 'Common',
    item: { id: 'chili', name: 'Cabai Liar', emoji: '🌶️', qty: 2, rarity: 'Common', sell: 15 },
  },
  {
    text: 'Kamu memetik jamur hutan.',
    coins: 40,
    exp: 12,
    emoji: '🍄',
    rarity: 'Common',
    item: { id: 'mushroom', name: 'Jamur Hutan', emoji: '🍄', qty: 3, rarity: 'Common', sell: 8 },
  },
  {
    text: 'Sarang lebah kecil jatuh dari pohon.',
    coins: 60,
    exp: 18,
    emoji: '🐝',
    rarity: 'Common',
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 1, rarity: 'Common', sell: 30 },
  },
  {
    text: 'Kamu menemukan akar ginseng liar.',
    coins: 70,
    exp: 20,
    emoji: '🌱',
    rarity: 'Common',
    item: { id: 'root', name: 'Akar Ginseng', emoji: '🌱', qty: 1, rarity: 'Common', sell: 20 },
  },

  // UNCOMMON
  {
    text: 'Daun herbal berkilau di rawa.',
    coins: 70,
    exp: 20,
    emoji: '🌿',
    rarity: 'Uncommon',
    item: { id: 'herb', name: 'Daun Herbal', emoji: '🌿', qty: 1, rarity: 'Uncommon', sell: 25 },
  },
  {
    text: 'Kristal mana kecil bersinar.',
    coins: 120,
    exp: 30,
    emoji: '🔷',
    rarity: 'Uncommon',
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
    text: 'Kulit kayu kuno untuk ramuan.',
    coins: 90,
    exp: 22,
    emoji: '🪵',
    rarity: 'Uncommon',
    item: { id: 'bark', name: 'Kulit Kayu', emoji: '🪵', qty: 2, rarity: 'Uncommon', sell: 18 },
  },

  // RARE
  {
    text: 'DUNGEON! Peti berisi madu hutan.',
    coins: 300,
    exp: 60,
    emoji: '🏰',
    rarity: 'Rare',
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 2, rarity: 'Uncommon', sell: 30 },
  },
  {
    text: 'Kamu menemukan bunga moonlight langka!',
    coins: 150,
    exp: 40,
    emoji: '🌸',
    rarity: 'Rare',
    item: { id: 'moonflower', name: 'Moonflower', emoji: '🌸', qty: 1, rarity: 'Rare', sell: 80 },
  },
  {
    text: 'Telur monster kecil masih hangat.',
    coins: 200,
    exp: 50,
    emoji: '🥚',
    rarity: 'Rare',
    item: {
      id: 'monster_egg',
      name: 'Telur Monster',
      emoji: '🥚',
      qty: 1,
      rarity: 'Rare',
      sell: 120,
    },
  },

  // EPIC
  {
    text: 'HARTA KARUN! Peti emas terkubur!',
    coins: 800,
    exp: 100,
    emoji: '💎',
    rarity: 'Epic',
    item: {
      id: 'gold_nugget',
      name: 'Bongkah Emas',
      emoji: '💎',
      qty: 1,
      rarity: 'Epic',
      sell: 300,
    },
  },
];

export function rollExplore(): ExploreOutcome {
  return EXPLORES[Math.floor(Math.random() * EXPLORES.length)];
}
