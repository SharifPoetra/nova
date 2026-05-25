export interface ClassData {
  name: string;
  emoji: string;
  color: number;
  baseHp: number;
  baseAtk: number;
  baseCritRate: number;
  skills: { id: string; unlock: number }[];
  description: string;
}

export const CLASSES: Record<string, ClassData> = {
  warrior: {
    name: 'Warrior',
    emoji: '⚔️',
    color: 0xe74c3c,
    baseHp: 120,
    baseAtk: 12,
    baseCritRate: 0.05,
    skills: [
      { id: 'rage', unlock: 1 },
      { id: 'shield_bash', unlock: 10 },
    ],
    description: 'Tanky. Skill Rage buat burst damage.',
  },
  mage: {
    name: 'Mage',
    emoji: '🔮',
    color: 0x3498db,
    baseHp: 80,
    baseAtk: 15,
    baseCritRate: 0.03,
    skills: [{ id: 'fireball', unlock: 1 }],
    description: 'Glass cannon. Fireball damage gede.',
  },
  rogue: {
    name: 'Rogue',
    emoji: '🗡️',
    color: 0x2ecc71,
    baseHp: 90,
    baseAtk: 14,
    baseCritRate: 0.15,
    skills: [{ id: 'backstab', unlock: 1 }],
    description: 'Crit master. Backstab sakit banget.',
  },
};

export function getClass(className: 'warrior' | 'mage' | 'rogue' | null): ClassData | null {
  if (!className) return null;
  return CLASSES[className] ?? null;
}
