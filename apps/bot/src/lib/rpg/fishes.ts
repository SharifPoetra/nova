import type { Rarity } from '../utils';

export interface Fish {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  chance: number;
  sellPrice: number;
  xp: number;
  type: 'material' | 'consumable';
  description: string;
}

export const FISHES: Fish[] = [
  {
    id: 'fish_sardine',
    name: 'Sarden',
    emoji: '🐟',
    rarity: 'Common',
    chance: 25,
    sellPrice: 5,
    xp: 8,
    type: 'material',
    description: 'Ikan kecil berminyak, cepat matang',
  },
  {
    id: 'fish_mackerel',
    name: 'Kembung',
    emoji: '🐟',
    rarity: 'Common',
    chance: 20,
    sellPrice: 7,
    xp: 9,
    type: 'material',
    description: 'Kembung segar dari laut dangkal',
  },
  {
    id: 'fish_tilapia',
    name: 'Nila',
    emoji: '🐠',
    rarity: 'Common',
    chance: 10,
    sellPrice: 8,
    xp: 10,
    type: 'material',
    description: 'Nila air tawar, daging lembut',
  },
  {
    id: 'fish_catfish',
    name: 'Lele Jumbo',
    emoji: '🐡',
    rarity: 'Uncommon',
    chance: 12,
    sellPrice: 15,
    xp: 14,
    type: 'material',
    description: 'Lele berlumpur ukuran besar',
  },
  {
    id: 'fish_tuna',
    name: 'Tuna Kecil',
    emoji: '🐟',
    rarity: 'Uncommon',
    chance: 8,
    sellPrice: 18,
    xp: 16,
    type: 'material',
    description: 'Tuna muda kaya protein',
  },
  {
    id: 'fish_salmon',
    name: 'Salmon',
    emoji: '🍣',
    rarity: 'Uncommon',
    chance: 5,
    sellPrice: 22,
    xp: 18,
    type: 'material',
    description: 'Salmon oranye, favorit koki',
  },
  {
    id: 'fish_goldfish',
    name: 'Ikan Mas Koki',
    emoji: '🐠',
    rarity: 'Rare',
    chance: 7,
    sellPrice: 40,
    xp: 25,
    type: 'material',
    description: 'Ikan hias pembawa keberuntungan',
  },
  {
    id: 'fish_puffer',
    name: 'Buntal Berduri',
    emoji: '🐡',
    rarity: 'Rare',
    chance: 4,
    sellPrice: 50,
    xp: 28,
    type: 'material',
    description: 'Berduri, hati-hati racunnya',
  },
  {
    id: 'fish_eel',
    name: 'Belut Listrik',
    emoji: '🦈',
    rarity: 'Rare',
    chance: 2,
    sellPrice: 65,
    xp: 30,
    type: 'material',
    description: 'Belut yang bisa menyetrum',
  },
  {
    id: 'fish_koi',
    name: 'Koi Legendaris',
    emoji: '🎏',
    rarity: 'Epic',
    chance: 3,
    sellPrice: 120,
    xp: 45,
    type: 'material',
    description: 'Koi sisik berkilau seperti emas',
  },
  {
    id: 'fish_sword',
    name: 'Todak Pedang',
    emoji: '🗡️',
    rarity: 'Epic',
    chance: 2,
    sellPrice: 150,
    xp: 50,
    type: 'material',
    description: 'Paruh tajam seperti pedang',
  },
  {
    id: 'fish_dragon',
    name: 'Ikan Naga',
    emoji: '🐉',
    rarity: 'Legendary',
    chance: 1.5,
    sellPrice: 300,
    xp: 80,
    type: 'material',
    description: 'Sisiknya berkilat seperti api',
  },
  {
    id: 'fish_kraken',
    name: 'Baby Kraken',
    emoji: '🦑',
    rarity: 'Legendary',
    chance: 0.5,
    sellPrice: 500,
    xp: 120,
    type: 'material',
    description: 'Bayi kraken bertentakel kecil',
  },
];

export function catchFish(): Fish {
  const roll = Math.random() * 100;
  let cum = 0;
  return FISHES.find((f) => (cum += f.chance) >= roll)!;
}
