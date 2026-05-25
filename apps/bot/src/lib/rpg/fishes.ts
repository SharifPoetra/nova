import type { Rarity } from '../utils';

export interface Fish {
  id: string;
  emoji: string;
  rarity: Rarity;
  chance: number;
  sellPrice: number;
  xp: number;
  type: 'material' | 'consumable';
  effects?: { type: 'heal' | 'stamina' | 'mana' | 'buff'; value: number }[];
}

export const FISHES: Fish[] = [
  {
    id: 'fish_sardine',
    emoji: '🐟',
    rarity: 'Common',
    chance: 25,
    sellPrice: 5,
    xp: 8,
    type: 'material',
  },
  {
    id: 'fish_mackerel',
    emoji: '🐟',
    rarity: 'Common',
    chance: 20,
    sellPrice: 7,
    xp: 9,
    type: 'material',
  },
  {
    id: 'fish_tilapia',
    emoji: '🐠',
    rarity: 'Common',
    chance: 10,
    sellPrice: 8,
    xp: 10,
    type: 'material',
  },
  {
    id: 'fish_catfish',
    emoji: '🐡',
    rarity: 'Uncommon',
    chance: 12,
    sellPrice: 15,
    xp: 14,
    type: 'material',
  },
  {
    id: 'fish_tuna',
    emoji: '🐟',
    rarity: 'Uncommon',
    chance: 8,
    sellPrice: 18,
    xp: 16,
    type: 'material',
  },
  {
    id: 'fish_salmon',
    emoji: '🍣',
    rarity: 'Uncommon',
    chance: 5,
    sellPrice: 22,
    xp: 18,
    type: 'material',
  },
  {
    id: 'fish_goldfish',
    emoji: '🐠',
    rarity: 'Rare',
    chance: 7,
    sellPrice: 40,
    xp: 25,
    type: 'material',
  },
  {
    id: 'fish_puffer',
    emoji: '🐡',
    rarity: 'Rare',
    chance: 4,
    sellPrice: 50,
    xp: 28,
    type: 'material',
  },
  {
    id: 'fish_eel',
    emoji: '🦈',
    rarity: 'Rare',
    chance: 2,
    sellPrice: 65,
    xp: 30,
    type: 'material',
  },
  {
    id: 'fish_koi',
    emoji: '🎏',
    rarity: 'Epic',
    chance: 3,
    sellPrice: 120,
    xp: 45,
    type: 'material',
  },
  {
    id: 'fish_sword',
    emoji: '🗡️',
    rarity: 'Epic',
    chance: 2,
    sellPrice: 150,
    xp: 50,
    type: 'material',
  },
  {
    id: 'fish_dragon',
    emoji: '🐉',
    rarity: 'Legendary',
    chance: 1.5,
    sellPrice: 300,
    xp: 80,
    type: 'material',
  },
  {
    id: 'fish_kraken',
    emoji: '🦑',
    rarity: 'Legendary',
    chance: 0.5,
    sellPrice: 500,
    xp: 120,
    type: 'material',
  },
];

export function catchFish(bonus = 0): Fish {
  const roll = Math.random() * 100;
  let cum = 0;
  const adjusted = FISHES.map((f) => {
    if (f.rarity === 'Common') {
      return { ...f, chance: f.chance * (1 - bonus * 0.5) };
    }
    const multiplier = f.rarity === 'Legendary' ? 1 + bonus * 2 : 1 + bonus;
    return { ...f, chance: f.chance * multiplier };
  });
  const total = adjusted.reduce((s, f) => s + f.chance, 0);
  const normalized = adjusted.map((f) => ({ ...f, chance: (f.chance / total) * 100 }));
  for (const f of normalized) {
    cum += f.chance;
    if (roll <= cum) return FISHES.find((orig) => orig.id === f.id)!;
  }
  return FISHES[0];
}
