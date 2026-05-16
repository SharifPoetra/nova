import type { IUser } from '@nova/database';
import { calculateDamage, PlayerStats } from './combat';

export type SkillTarget = 'self' | 'enemy' | 'all_enemies' | 'ally';
export type SkillEffectType = 'damage' | 'heal' | 'buff' | 'debuff';

export interface SkillEffect {
  type: SkillEffectType;
  value: number | string;
  element?: 'phys' | 'fire' | 'ice' | 'light' | 'dark';
  duration?: number;
  chance?: number;
}

export interface SkillContext {
  user: IUser;
  stats: PlayerStats;
  enemy: { hp: number; def: number; element?: string };
  t: (key: string, opts?: any) => string;
  addBuff: (type: string, value: number, duration: number) => void;
  addLog: (text: string) => void;
}

export interface SkillData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cooldown: number;
  staminaCost: number;
  target: SkillTarget;
  effects: SkillEffect[];
  classLock?: ('warrior' | 'mage' | 'rogue')[];
  requiredLevel?: number;
  passive?: boolean;
  use: (ctx: SkillContext) => { damage: number; heal: number; isCrit: boolean };
}

// Helper parse '1.5*atk' jadi number
function parseValue(value: string | number, atk: number): number {
  if (typeof value === 'number') return value;
  if (value.includes('*atk')) return parseFloat(value.replace('*atk', '')) * atk;
  return parseFloat(value);
}

export const SKILLS: Record<string, SkillData> = {
  rage: {
    id: 'rage',
    name: 'Rage',
    emoji: '😡',
    description: 'Amarah warrior. +30% ATK selama 10 detik. Cooldown 30s.',
    cooldown: 30000,
    staminaCost: 20,
    target: 'self',
    classLock: ['warrior'],
    effects: [{ type: 'buff', value: 'buff:atk:0.3', duration: 10000 }],
    use: (ctx) => {
      ctx.addBuff('atk', 0.3, 10000); // +30% atk 10s
      ctx.addLog(`✨ 😡 Rage! ATK up 30% for 10s`);
      return { damage: 0, heal: 0, isCrit: false };
    },
  },

  fireball: {
    id: 'fireball',
    name: 'Fireball',
    emoji: '🔥',
    description: 'Bola api mage. Damage 150% ATK. Cooldown 20s.',
    cooldown: 20000,
    staminaCost: 25,
    target: 'enemy',
    classLock: ['mage'],
    effects: [{ type: 'damage', value: '1.5*atk', element: 'fire' }],
    use: (ctx) => {
      const mult = parseValue('1.5*atk', ctx.stats.atk) / ctx.stats.atk;
      const { damage, isCrit } = calculateDamage(ctx.stats, ctx.enemy, mult);
      ctx.addLog(`✨ 🔥 Fireball! **${damage}**${isCrit? ' 💥CRIT!' : ''}`);
      return { damage, heal: 0, isCrit };
    },
  },

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
      { type: 'damage', value: '2.0*atk', element: 'phys' },
      { type: 'buff', value: 'buff:critRate:0.2', duration: 0 },
    ],
    use: (ctx) => {
      // Temporarily boost crit buat hit ini
      const boostedStats = {...ctx.stats, critRate: ctx.stats.critRate + 0.2 };
      const { damage, isCrit } = calculateDamage(boostedStats, ctx.enemy, 2.0);
      ctx.addLog(`✨ 🗡️ Backstab! **${damage}**${isCrit? ' 💥CRIT!' : ''}`);
      return { damage, heal: 0, isCrit };
    },
  },

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
    effects: [{ type: 'buff', value: 'passive:atk_per_hp_loss' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }), // passive gak dipanggil manual
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
