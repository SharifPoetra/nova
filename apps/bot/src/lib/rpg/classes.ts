export interface ClassData {
  name: string;
  emoji: string;
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
    baseHp: 80,
    baseAtk: 15,
    baseCritRate: 0.03,
    skillId: 'fireball',
    description: 'Glass cannon. Fireball damage gede.',
  },
  rogue: {
    name: 'Rogue',
    emoji: '🗡️',
    baseHp: 90,
    baseAtk: 14,
    baseCritRate: 0.15,
    skillId: 'backstab',
    description: 'Crit master. Backstab sakit banget.',
  },
};

// === JANGAN DIHAPUS: Function ini dipake command lama ===
export function getClass(className: 'warrior' | 'mage' | 'rogue' | null): ClassData | null {
  if (!className) return null;
  return CLASSES[className] ?? null;
}

// === HELPER BARU buat Phase 2 ===
export function getClassSkillId(className: 'warrior' | 'mage' | 'rogue'): string {
  return CLASSES[className].skillId;
}

export function getClassPassiveId(className: 'warrior' | 'mage' | 'rogue'): string | undefined {
  return CLASSES[className].passiveId;
}
