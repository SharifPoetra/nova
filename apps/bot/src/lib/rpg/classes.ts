export interface ClassData {
  name: string;
  emoji: string;
  color: number;
  baseHp: number;
  baseAtk: number;
  baseCritRate: number;
  skillId: string;
  passiveId?: string;
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
    skillId: 'rage',
    passiveId: 'berserker_passive',
    description: 'Tanky. Skill Rage buat burst damage.',
  },
  mage: {
    name: 'Mage',
    emoji: '🔮',
    color: 0x3498db,
    baseHp: 80,
    baseAtk: 15,
    baseCritRate: 0.03,
    skillId: 'fireball',
    description: 'Glass cannon. Fireball damage gede.',
  },
  rogue: {
    name: 'Rogue',
    emoji: '🗡️',
    color: 0x2ecc71,
    baseHp: 90,
    baseAtk: 14,
    baseCritRate: 0.15,
    skillId: 'backstab',
    description: 'Crit master. Backstab sakit banget.',
  },
};

export function getClass(className: 'warrior' | 'mage' | 'rogue' | null): ClassData | null {
  if (!className) return null;
  return CLASSES[className] ?? null;
}

export function getClassSkillId(className: 'warrior' | 'mage' | 'rogue'): string {
  return CLASSES[className].skillId;
}

export function getClassPassiveId(className: 'warrior' | 'mage' | 'rogue'): string | undefined {
  return CLASSES[className].passiveId;
}
