import type { Rarity } from '../utils';

export interface Fish {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  chance: number;
  sell: number;
  xp: number;
}

export const FISHES: Fish[] = [
  // COMMON 55%
  { id: 'fish_sardine', name: 'Sarden', emoji: '🐟', rarity: 'Common', chance: 25, sell: 5, xp: 8 },
  {
    id: 'fish_mackerel',
    name: 'Kembung',
    emoji: '🐟',
    rarity: 'Common',
    chance: 20,
    sell: 7,
    xp: 9,
  },
  { id: 'fish_tilapia', name: 'Nila', emoji: '🐠', rarity: 'Common', chance: 10, sell: 8, xp: 10 },

  // UNCOMMON 25%
  {
    id: 'fish_catfish',
    name: 'Lele Jumbo',
    emoji: '🐡',
    rarity: 'Uncommon',
    chance: 12,
    sell: 15,
    xp: 14,
  },
  {
    id: 'fish_tuna',
    name: 'Tuna Kecil',
    emoji: '🐟',
    rarity: 'Uncommon',
    chance: 8,
    sell: 18,
    xp: 16,
  },
  {
    id: 'fish_salmon',
    name: 'Salmon',
    emoji: '🍣',
    rarity: 'Uncommon',
    chance: 5,
    sell: 22,
    xp: 18,
  },

  // RARE 13%
  {
    id: 'fish_goldfish',
    name: 'Ikan Mas Koki',
    emoji: '🐠',
    rarity: 'Rare',
    chance: 7,
    sell: 40,
    xp: 25,
  },
  {
    id: 'fish_puffer',
    name: 'Buntal Berduri',
    emoji: '🐡',
    rarity: 'Rare',
    chance: 4,
    sell: 50,
    xp: 28,
  },
  {
    id: 'fish_eel',
    name: 'Belut Listrik',
    emoji: '🦈',
    rarity: 'Rare',
    chance: 2,
    sell: 65,
    xp: 30,
  },

  // EPIC 5%
  {
    id: 'fish_koi',
    name: 'Koi Legendaris',
    emoji: '🎏',
    rarity: 'Epic',
    chance: 3,
    sell: 120,
    xp: 45,
  },
  {
    id: 'fish_sword',
    name: 'Todak Pedang',
    emoji: '🗡️',
    rarity: 'Epic',
    chance: 2,
    sell: 150,
    xp: 50,
  },

  // LEGENDARY 2%
  {
    id: 'fish_dragon',
    name: 'Ikan Naga',
    emoji: '🐉',
    rarity: 'Legendary',
    chance: 1.5,
    sell: 300,
    xp: 80,
  },
  {
    id: 'fish_kraken',
    name: 'Baby Kraken',
    emoji: '🦑',
    rarity: 'Legendary',
    chance: 0.5,
    sell: 500,
    xp: 120,
  },
];

export function catchFish(): Fish {
  const roll = Math.random() * 100;
  let cum = 0;
  return FISHES.find((f) => (cum += f.chance) >= roll)!;
}
