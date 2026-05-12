import type { Rarity } from '../utils';

export interface Drop {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  chance: number;
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  description: string;
}

export interface BaseMonster {
  name: string;
  emoji: string;
  hp: number;
  dmg: [number, number];
  minLevel: number;
  xp: number;
  drops: Drop[];
}

export const BASE_MONSTERS: BaseMonster[] = [
  {
    name: 'Wild Boar',
    emoji: '🐗',
    hp: 60,
    dmg: [8, 15],
    minLevel: 1,
    xp: 18,
    drops: [
      {
        id: 'meat',
        name: 'Daging Babi',
        emoji: '🥩',
        rarity: 'Common',
        chance: 60,
        sellPrice: 12,
        type: 'material',
        description: 'Daging merah, bahan dasar steak',
      },
      {
        id: 'fang',
        name: 'Taring Babi',
        emoji: '🦷',
        rarity: 'Uncommon',
        chance: 30,
        sellPrice: 28,
        type: 'material',
        description: 'Taring tajam untuk kerajinan',
      },
      {
        id: 'boar_heart',
        name: 'Jantung Babi',
        emoji: '❤️',
        rarity: 'Rare',
        chance: 10,
        sellPrice: 75,
        type: 'material',
        description: 'Jantung berotot, dipercaya tambah stamina',
      },
    ],
  },
  {
    name: 'Goblin Scout',
    emoji: '👺',
    hp: 50,
    dmg: [5, 12],
    minLevel: 1,
    xp: 15,
    drops: [
      {
        id: 'goblin_ear',
        name: 'Telinga Goblin',
        emoji: '👂',
        rarity: 'Common',
        chance: 55,
        sellPrice: 10,
        type: 'material',
        description: 'Bukti buruan goblin',
      },
      {
        id: 'hide',
        name: 'Kulit Goblin',
        emoji: '🦌',
        rarity: 'Common',
        chance: 30,
        sellPrice: 12,
        type: 'material',
        description: 'Kulit kasar, bisa untuk sup',
      },
      {
        id: 'goblin_dagger',
        name: 'Belati Karat',
        emoji: '🗡️',
        rarity: 'Uncommon',
        chance: 15,
        sellPrice: 40,
        type: 'equipment',
        description: 'Belati curian, masih bisa dipakai',
      },
    ],
  },
  {
    name: 'Swamp Lizard',
    emoji: '🦎',
    hp: 70,
    dmg: [10, 18],
    minLevel: 2,
    xp: 22,
    drops: [
      {
        id: 'lizard_meat',
        name: 'Daging Kadal',
        emoji: '🍗',
        rarity: 'Common',
        chance: 60,
        sellPrice: 14,
        type: 'material',
        description: 'Daging rawa, cocok disate',
      },
      {
        id: 'lizard_tail',
        name: 'Ekor Kadal',
        emoji: '🦎',
        rarity: 'Uncommon',
        chance: 30,
        sellPrice: 26,
        type: 'material',
        description: 'Ekor yang bisa tumbuh lagi',
      },
      {
        id: 'scale',
        name: 'Sisik Hijau',
        emoji: '🟢',
        rarity: 'Rare',
        chance: 10,
        sellPrice: 60,
        type: 'material',
        description: 'Sisik mengkilap dari rawa',
      },
    ],
  },
  {
    name: 'Forest Wolf',
    emoji: '🐺',
    hp: 80,
    dmg: [12, 20],
    minLevel: 3,
    xp: 28,
    drops: [
      {
        id: 'wolf_meat',
        name: 'Daging Serigala',
        emoji: '🍖',
        rarity: 'Common',
        chance: 50,
        sellPrice: 15,
        type: 'material',
        description: 'Daging liar berotot',
      },
      {
        id: 'claw',
        name: 'Cakar Serigala',
        emoji: '🐾',
        rarity: 'Uncommon',
        chance: 35,
        sellPrice: 25,
        type: 'material',
        description: 'Cakar tajam untuk kerajinan',
      },
      {
        id: 'pelt',
        name: 'Bulu Alpha',
        emoji: '🧶',
        rarity: 'Rare',
        chance: 5,
        sellPrice: 55,
        type: 'material',
        description: 'Bulu tebal pemimpin kawanan',
      },
      {
        id: 'eye_wolf',
        name: 'Mata Serigala',
        emoji: '👁️',
        rarity: 'Epic',
        chance: 10,
        sellPrice: 180,
        type: 'material',
        description: 'Mata yang masih menyala dalam gelap',
      },
    ],
  },
  {
    name: 'Cave Bear',
    emoji: '🐻',
    hp: 120,
    dmg: [18, 28],
    minLevel: 5,
    xp: 45,
    drops: [
      {
        id: 'bear_meat',
        name: 'Daging Beruang',
        emoji: '🥩',
        rarity: 'Uncommon',
        chance: 50,
        sellPrice: 35,
        type: 'material',
        description: 'Daging berlemak dari gua',
      },
      {
        id: 'honey',
        name: 'Madu Liar',
        emoji: '🍯',
        rarity: 'Uncommon',
        chance: 15,
        sellPrice: 30,
        type: 'consumable',
        description: 'Madu manis curian beruang',
      },
      {
        id: 'bear_claw',
        name: 'Cakar Beruang',
        emoji: '🐾',
        rarity: 'Rare',
        chance: 30,
        sellPrice: 80,
        type: 'material',
        description: 'Cakar besar penghancur',
      },
      {
        id: 'heart_alpha',
        name: 'Jantung Alpha',
        emoji: '❤️‍🔥',
        rarity: 'Legendary',
        chance: 5,
        sellPrice: 400,
        type: 'material',
        description: 'Jantung beruang alpha, sangat langka',
      },
    ],
  },
];

export function getScaledMonster(userLevel: number) {
  const available = BASE_MONSTERS.filter((m) => userLevel >= m.minLevel);
  const base = available[Math.floor(Math.random() * available.length)];
  const diff = userLevel - base.minLevel;
  const hpScale = 1 + diff * 0.12;
  const dmgScale = 1 + diff * 0.08;
  return {
    ...base,
    hp: Math.floor(base.hp * hpScale),
    dmg: [Math.floor(base.dmg[0] * dmgScale), Math.floor(base.dmg[1] * dmgScale)] as [
      number,
      number,
    ],
    xp: Math.floor(base.xp * hpScale),
  };
}
