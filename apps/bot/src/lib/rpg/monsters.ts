export interface Drop {
  id: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  chance: number;
  sell: number;
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
      { id: 'meat', name: 'Daging Babi', emoji: '🥩', rarity: 'Common', chance: 60, sell: 12 },
      { id: 'fang', name: 'Taring Babi', emoji: '🦷', rarity: 'Uncommon', chance: 30, sell: 28 },
      { id: 'boar_heart', name: 'Jantung Babi', emoji: '❤️', rarity: 'Rare', chance: 10, sell: 75 },
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
        sell: 10,
      },
      { id: 'hide', name: 'Kulit Goblin', emoji: '🦌', rarity: 'Common', chance: 30, sell: 12 },
      {
        id: 'goblin_dagger',
        name: 'Belati Karat',
        emoji: '🗡️',
        rarity: 'Uncommon',
        chance: 15,
        sell: 40,
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
        sell: 14,
      },
      {
        id: 'lizard_tail',
        name: 'Ekor Kadal',
        emoji: '🦎',
        rarity: 'Uncommon',
        chance: 30,
        sell: 26,
      },
      { id: 'scale', name: 'Sisik Hijau', emoji: '🟢', rarity: 'Rare', chance: 10, sell: 60 },
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
        sell: 15,
      },
      { id: 'claw', name: 'Cakar Serigala', emoji: '🐾', rarity: 'Uncommon', chance: 35, sell: 25 },
      { id: 'pelt', name: 'Bulu Alpha', emoji: '🧶', rarity: 'Rare', chance: 5, sell: 55 },
      { id: 'eye_wolf', name: 'Mata Serigala', emoji: '👁️', rarity: 'Epic', chance: 10, sell: 180 },
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
        sell: 35,
      },
      { id: 'honey', name: 'Madu Liar', emoji: '🍯', rarity: 'Uncommon', chance: 15, sell: 30 },
      { id: 'bear_claw', name: 'Cakar Beruang', emoji: '🐾', rarity: 'Rare', chance: 30, sell: 80 },
      {
        id: 'heart_alpha',
        name: 'Jantung Alpha',
        emoji: '❤️‍🔥',
        rarity: 'Legendary',
        chance: 5,
        sell: 400,
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
