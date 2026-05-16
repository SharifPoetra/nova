import type { IUser } from '@nova/database';

// === SKILL SYSTEM TYPES ===
export type SkillTarget = 'self' | 'enemy' | 'all_enemies' | 'ally';
export type SkillEffectType = 'damage' | 'heal' | 'buff' | 'debuff';

export interface SkillEffect {
  type: SkillEffectType;
  value: number | string; // number = flat, string = formula like '0.5*atk'
  element?: 'phys' | 'fire' | 'ice' | 'light' | 'dark';
  duration?: number; // ms, buat buff/debuff
  chance?: number; // 0-1, chance to apply
}

export interface SkillData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cooldown: number; // ms
  staminaCost: number;
  target: SkillTarget;
  effects: SkillEffect[];
  classLock?: ('warrior' | 'mage' | 'rogue')[];
  requiredLevel?: number;
  passive?: boolean; // kalau true = auto trigger, bukan button
}

// 3 SKILL AWAL DARI DUNGEON-BATTLE.TS ===
export const SKILLS: Record<string, SkillData> = {
  // === WARRIOR ===
  rage: {
    id: 'rage',
    name: 'Rage',
    emoji: '😡',
    description: 'Amarah warrior. +30% ATK selama 10 detik. Cooldown 30s.',
    cooldown: 30000,
    staminaCost: 20,
    target: 'self',
    classLock: ['warrior'],
    effects: [
      {
        type: 'buff',
        value: 'buff:atk:0.3', // +30% atk
        duration: 10000,
      },
    ],
  },

  // === MAGE ===
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    emoji: '🔥',
    description: 'Bola api mage. Damage 150% ATK. Cooldown 20s.',
    cooldown: 20000,
    staminaCost: 25,
    target: 'enemy',
    classLock: ['mage'],
    effects: [
      {
        type: 'damage',
        value: '1.5*atk',
        element: 'fire',
      },
    ],
  },

  // === ROGUE ===
  backstab: {
    id: 'backstab',
    name: 'Backstab',
    emoji: '🗡️',
    description: 'Tusukan dari belakang. Damage 200% ATK + crit chance naik 20%. Cooldown 25s.',
    cooldown: 25000,
    staminaCost: 15,
    target: 'enemy',
    classLock: ['rogue'],
    effects: [
      {
        type: 'damage',
        value: '2.0*atk',
        element: 'phys',
      },
      {
        type: 'buff',
        value: 'buff:critRate:0.2', // +20% crit untuk hit ini
        duration: 0, // instant
      },
    ],
  },

  // === PASSIVE CONTOH: Buat Phase 5 nanti ===
  berserker_passive: {
    id: 'berserker_passive',
    name: 'Berserker Blood',
    emoji: '🩸',
    description: 'Passive: +1% ATK tiap 10% HP hilang.',
    cooldown: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['warrior'],
    passive: true,
    requiredLevel: 10,
    effects: [
      {
        type: 'buff',
        value: 'passive:atk_per_hp_loss',
      },
    ],
  },
};

export function getSkill(id: string): SkillData | null {
  return SKILLS[id]?? null;
}

export function getSkillsByClass(className: 'warrior' | 'mage' | 'rogue'): SkillData[] {
  return Object.values(SKILLS).filter(
    s =>!s.passive && (!s.classLock || s.classLock.includes(className))
  );
}

export function getPassiveSkills(user: IUser): SkillData[] {
  if (!user.class) return [];
  return Object.values(SKILLS).filter(
    s => s.passive &&
    s.classLock?.includes(user.class!) &&
    (!s.requiredLevel || user.level >= s.requiredLevel)
  );
}
