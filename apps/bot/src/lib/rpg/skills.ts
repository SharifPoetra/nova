import type { IUser, Element } from '@nova/db';
import { calculateDamage, PlayerStats } from './combat';

export type SkillTarget = 'self' | 'enemy' | 'all_enemies' | 'ally';
export type SkillEffectType = 'damage' | 'heal' | 'buff' | 'debuff';

export interface SkillEffect {
  type: SkillEffectType;
  value: number | string;
  element?: Element;
  duration?: number;
  chance?: number;
}

export interface SkillContext {
  user: IUser;
  stats: PlayerStats;
  enemy: { hp: number; def: number; element?: Element };
  t: (key: string, opts?: any) => string;
  addBuff: (type: string, value: number, durationTurns: number) => void;
  addLog: (text: string) => void;
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

// === SKILL & PASSIVE DEFINITIONS ===
export const SKILLS: Record<string, SkillData> = {
  // === SKILLS ===
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
      { type: 'damage', value: '0.8*atk', element: 'physical' },
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
      { type: 'damage', value: '1.2*atk', element: 'physical' },
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
      { type: 'damage', value: '2.0*atk', element: 'physical' },
    ],
    use: (ctx) => {
      const res = executeEffects(ctx, SKILLS.backstab);
      ctx.addLog(`✨ 🗡️ Backstab! **${res.damage}**${res.isCrit ? ' 💥CRIT!' : ''}`);
      return res;
    },
  },

  // === PASSIVES ===
  shield_wall: {
    id: 'shield_wall',
    name: 'Shield Wall',
    emoji: '🛡️',
    description: '20% chance to block 30% damage',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['warrior'],
    passive: true,
    requiredLevel: 5,
    effects: [{ type: 'buff', value: 'passive:flag:always:warrior_block' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },
  berserker_passive: {
    id: 'berserker_passive',
    name: 'Berserker Blood',
    emoji: '🩸',
    description: '+1% ATK per 10% HP lost.',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['warrior'],
    passive: true,
    requiredLevel: 10,
    effects: [{ type: 'buff', value: 'passive:atk_pct:hp_loss:0.01' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },

  // rogue
  evasion: {
    id: 'evasion',
    name: 'Evasion',
    emoji: '💨',
    description: '+10% dodge when HP >70%',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['rogue'],
    passive: true,
    requiredLevel: 5,
    effects: [{ type: 'buff', value: 'passive:dodge:hp>0.7:0.10' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },
  shadow_dance: {
    id: 'shadow_dance',
    name: 'Shadow Dance',
    emoji: '👤',
    description: '+15% crit rate when HP >70%',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['rogue'],
    passive: true,
    requiredLevel: 10,
    effects: [{ type: 'buff', value: 'passive:critRate:hp>0.7:0.15' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },

  // mage
  mana_shield: {
    id: 'mana_shield',
    name: 'Mana Shield',
    emoji: '🔮',
    description: 'Convert 20% damage taken to stamina loss',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['mage'],
    passive: true,
    requiredLevel: 5,
    effects: [{ type: 'buff', value: 'passive:flag:always:mana_shield' }],
    use: () => ({ damage: 0, heal: 0, isCrit: false }),
  },
  arcane_intellect: {
    id: 'arcane_intellect',
    name: 'Arcane Intellect',
    emoji: '📖',
    description: '+25% crit damage when HP >50%',
    cooldownTurns: 0,
    staminaCost: 0,
    target: 'self',
    classLock: ['mage'],
    passive: true,
    requiredLevel: 10,
    effects: [{ type: 'buff', value: 'passive:critDmg:hp>0.5:0.25' }],
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
      const originalElement = tempStats.element;
      if (eff.element) tempStats.element = eff.element;

      const res = calculateDamage(tempStats, ctx.enemy, mult);
      totalDamage += res.damage;
      isCrit = isCrit || res.isCrit;

      tempStats.element = originalElement;
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
