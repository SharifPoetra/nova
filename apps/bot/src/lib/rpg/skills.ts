import type { IUser } from '@nova/db';
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
  addBuff: (type: string, value: number, durationTurns: number) => void;
  addLog: (text: string) => void;
  // dipakai internal untuk efek battle-only
  stunTurns?: number;
}

export interface SkillData {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cooldownTurns: number;
  staminaCost: number;
  target: SkillTarget;
  effects: SkillEffect[];
  classLock?: ('warrior' | 'mage' | 'rogue')[];
  requiredLevel?: number;
  passive?: boolean;
  use: (ctx: SkillContext) => { damage: number; heal: number; isCrit: boolean };
}

function parseValue(value: string | number, atk: number): number {
  if (typeof value === 'number') return value;
  if (value.includes('*atk')) return parseFloat(value.replace('*atk', '')) * atk;
  return parseFloat(value);
}

// === EXECUTOR GENERIC ===
function executeEffects(ctx: SkillContext, skill: SkillData) {
  let totalDamage = 0;
  let totalHeal = 0;
  let isCrit = false;
  let tempStats = { ...ctx.stats };

  for (const eff of skill.effects) {
    // chance check
    if (eff.chance && Math.random() > eff.chance) continue;

    if (eff.type === 'damage') {
      const mult = parseValue(eff.value, tempStats.atk) / tempStats.atk;
      const res = calculateDamage(tempStats, ctx.enemy, mult);
      totalDamage += res.damage;
      isCrit = isCrit || res.isCrit;
    }

    if (eff.type === 'heal') {
      const heal = parseValue(eff.value, tempStats.atk);
      totalHeal += Math.floor(heal);
    }

    if (eff.type === 'buff') {
      // format: "buff:atk:0.3" atau "buff:critRate:0.2"
      const parts = String(eff.value).split(':');
      if (parts[0] === 'buff' && parts.length === 3) {
        const [, stat, val] = parts;
        const numVal = parseFloat(val);
        if (eff.duration && eff.duration > 0) {
          // buff bertahan → simpan ke DB
          ctx.addBuff(stat, numVal, eff.duration);
        } else {
          // buff instant untuk hit ini aja (kayak backstab)
          (tempStats as any)[stat] = (tempStats as any)[stat] + numVal;
        }
      }
    }

    if (eff.type === 'debuff' && eff.value === 'stun') {
      ctx.stunTurns = eff.duration ?? 1;
    }
  }

  return { damage: totalDamage, heal: totalHeal, isCrit };
}

// === SKILL DEFINITIONS ===
export const SKILLS: Record<string, SkillData> = {
  rage: {
    id: 'rage',
    name: 'Rage',
    emoji: '😡',
    description: 'Amarah warrior. +30% ATK selama 3 turn. Cooldown 5 turn.',
    cooldownTurns: 5,
    staminaCost: 20,
    target: 'self',
    classLock: ['warrior'],
    effects: [
      { type: 'buff', value: 'buff:atk:0.3', duration: 3 },
      { type: 'damage', value: '0.8*atk' },
    ],
    use: (ctx) => {
      const res = executeEffects(ctx, SKILLS.rage);
      ctx.addLog(`✨ 😡 Rage! 🗡 ${res.damage} • +30% ATK (3 turns)`);
      return res;
    },
  },

  shield_bash: {
    id: 'shield_bash',
    name: 'Shield Bash',
    emoji: '🛡️',
    description: 'Gebuk pake tameng. Damage 120% ATK + stun 1 turn. Cooldown 4 turn.',
    cooldownTurns: 4,
    staminaCost: 15,
    target: 'enemy',
    classLock: ['warrior'],
    requiredLevel: 10,
    effects: [
      { type: 'damage', value: '1.2*atk', element: 'phys' },
      { type: 'debuff', value: 'stun', duration: 1 },
    ],
    use: (ctx) => {
      const res = executeEffects(ctx, SKILLS.shield_bash);
      ctx.addLog(`✨ 🛡️ Shield Bash! **${res.damage}**${res.isCrit ? ' 💥CRIT!' : ''} • Stun 1t`);
      return res;
    },
  },

  fireball: {
    id: 'fireball',
    name: 'Fireball',
    emoji: '🔥',
    description: 'Bola api mage. Damage 150% ATK. Cooldown 3 turn.',
    cooldownTurns: 3,
    staminaCost: 25,
    target: 'enemy',
    classLock: ['mage'],
    effects: [{ type: 'damage', value: '1.5*atk', element: 'fire' }],
    use: (ctx) => {
      const res = executeEffects(ctx, SKILLS.fireball);
      ctx.addLog(`✨ 🔥 Fireball! **${res.damage}**${res.isCrit ? ' 💥CRIT!' : ''}`);
      return res;
    },
  },

  backstab: {
    id: 'backstab',
    name: 'Backstab',
    emoji: '🗡️',
    description: 'Tusukan dari belakang. Damage 200% ATK + crit chance naik 20%. Cooldown 4 turn.',
    cooldownTurns: 4,
    staminaCost: 15,
    target: 'enemy',
    classLock: ['rogue'],
    effects: [
      { type: 'buff', value: 'buff:critRate:0.2', duration: 0 }, // instant
      { type: 'damage', value: '2.0*atk', element: 'phys' },
    ],
    use: (ctx) => {
      const res = executeEffects(ctx, SKILLS.backstab);
      ctx.addLog(`✨ 🗡️ Backstab! **${res.damage}**${res.isCrit ? ' 💥CRIT!' : ''}`);
      return res;
    },
  },

  berserker_passive: {
    id: 'berserker_passive',
    name: 'Berserker Blood',
    emoji: '🩸',
    description: 'Passive: +1% ATK per 10% HP lost.',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['warrior'],
    passive: true,
    requiredLevel: 10,
    effects: [{ type: 'buff', value: 'passive:atk_pct:hp_loss:0.01' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },
};

export function getSkill(id: string): SkillData | null {
  return SKILLS[id] ?? null;
}

export function getSkillsByClass(className: 'warrior' | 'mage' | 'rogue'): SkillData[] {
  return Object.values(SKILLS).filter(
    (s) => !s.passive && (!s.classLock || s.classLock.includes(className)),
  );
}

export function getPassiveSkills(user: IUser): SkillData[] {
  if (!user.class) return [];
  return Object.values(SKILLS).filter(
    (s) =>
      s.passive &&
      s.classLock?.includes(user.class!) &&
      (!s.requiredLevel || user.level >= s.requiredLevel),
  );
}
