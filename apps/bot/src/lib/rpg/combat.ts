import { getClass } from './classes';
import { getPassiveSkills, getSkill, SkillData } from './skills';
import { Item } from '@nova/db';
import type { IUser, IEquipmentStat } from '@nova/db';
import { User } from '@nova/db';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  critRate: number; // 0.05 = 5%
  critDmg: number; // 2.0 = 200%
  element: 'phys' | 'fire' | 'ice' | 'light' | 'dark';
  activeBuffs: { type: string; value: number; turnsLeft: number }[];
  availableSkills: string[]; // skill IDs yang bisa dipake
}

// === HELPER: Gabungin semua stat dari equipment ===
async function sumEquipmentStats(equipIds: (string | null)[]): Promise<IEquipmentStat> {
  const total: IEquipmentStat = { atk: 0, hp: 0, def: 0, critRate: 0, critDmg: 0 };

  const validIds = equipIds.filter(Boolean) as string[];
  if (validIds.length === 0) return total;

  // Ambil dari DB, bukan static getEquipment
  const items = await Item.find({ itemId: { $in: validIds } }).lean();

  for (const eq of items) {
    if (!eq?.stats) continue;

    total.atk = (total.atk ?? 0) + (eq.stats.atk ?? 0);
    total.hp = (total.hp ?? 0) + (eq.stats.hp ?? 0);
    total.def = (total.def ?? 0) + (eq.stats.def ?? 0);
    total.critRate = (total.critRate ?? 0) + (eq.stats.critRate ?? 0);
    total.critDmg = (total.critDmg ?? 0) + (eq.stats.critDmg ?? 0);
    if (eq.slot === 'weapon' && eq.stats.element) {
      total.element = eq.stats.element;
    }
  }
  return total;
}

// === HELPER: Apply buff ke stat, PAKE turnsLeft ===
function applyBuffs(base: number, buffs: IUser['buffs'], buffType: string): number {
  let multiplier = 1;
  for (const buff of buffs) {
    // Cek turnsLeft dulu kalo battle buff
    const isActive = buff.battle
      ? (buff.turnsLeft ?? 0) >= 0 // buff battle harus ada turnsLeft
      : buff.expires
        ? buff.expires.getTime() > Date.now() // buff passive pake expires
        : false; // kalo dua-duanya nggak ada, anggap inactive

    if (buff.type === buffType && isActive) {
      multiplier += buff.value; // 0.3 = +30%
    }
  }
  return Math.floor(base * multiplier);
}

// === HELPER: Apply passive skill ===
function applyPassives(baseStats: PlayerStats, user: IUser): PlayerStats {
  const passives = getPassiveSkills(user) ?? [];
  const newStats = { ...baseStats };

  if (!newStats.availableSkills) newStats.availableSkills = [];

  for (const passive of passives) {
    for (const effect of passive.effects) {
      if (effect.type === 'buff' && effect.value === 'passive:atk_per_hp_loss') {
        const hpLostPercent = 1 - baseStats.hp / baseStats.maxHp; // +1% ATK per 10% HP lost
        const atkBonus = Math.floor(hpLostPercent * 10) * 0.01;
        newStats.atk = Math.floor(newStats.atk * (1 + atkBonus));
      }
    }
  }
  return newStats;
}

// === MAIN FUNCTION: Dipake semua command ===
export async function getPlayerStats(user: IUser): Promise<PlayerStats> {
  const classData = getClass(user.class);
  const baseAtk = (classData?.baseAtk ?? 10) + Math.floor(user.level * 1.5);
  const baseHp = (classData?.baseHp ?? 100) + Math.floor(user.level * 10);
  const baseCritRate = classData?.baseCritRate ?? 0.05;

  let stats: PlayerStats = {
    hp: user.hp,
    maxHp: baseHp,
    atk: baseAtk,
    def: 0,
    critRate: baseCritRate,
    critDmg: 1.5,
    element: 'phys',
    activeBuffs: [],
    availableSkills: [],
  };

  const eq = user.equipped ?? {
    weapon: null,
    helmet: null,
    armor: null,
    accessory: null,
    tool: null,
  };
  const equipIds = [eq.weapon, eq.helmet, eq.armor, eq.accessory, eq.tool];
  const eqStats = await sumEquipmentStats(equipIds);

  stats.atk += eqStats.atk ?? 0;
  stats.maxHp += eqStats.hp ?? 0;
  stats.def += eqStats.def ?? 0;
  stats.critRate += eqStats.critRate ?? 0;
  stats.critDmg += eqStats.critDmg ?? 0;
  if (eqStats.element) stats.element = eqStats.element;

  stats.atk = applyBuffs(stats.atk, user.buffs, 'atk');
  stats.maxHp = applyBuffs(stats.maxHp, user.buffs, 'hp');

  stats = applyPassives(stats, user);

  if (classData?.skills) {
    for (const s of classData.skills) {
      if (user.level >= s.unlock) {
        stats.availableSkills.push(s.id);
      }
    }
  }

  const equippedItems = await Item.find({ itemId: { $in: equipIds.filter(Boolean) } }).lean();
  for (const eq of equippedItems) {
    if (eq?.stats?.grantsSkill) {
      stats.availableSkills.push(eq.stats.grantsSkill);
    }
  }

  stats.hp = Math.max(0, Math.min(stats.hp, stats.maxHp));
  stats.critRate = Math.min(stats.critRate, 1);
  stats.def = Math.max(0, stats.def);

  stats.activeBuffs = user.buffs
    .filter((b) => {
      if (b.turnsLeft !== undefined) return b.turnsLeft >= 0;
      return (b.expires?.getTime() ?? 0) > Date.now();
    })
    .map((b) => ({
      type: b.type,
      value: b.value,
      turnsLeft: b.turnsLeft ?? Math.ceil(((b.expires?.getTime() ?? 0) - Date.now()) / 6000),
    }));

  return stats;
}

// === DAMAGE CALC ===
export function calculateDamage(
  attacker: PlayerStats,
  defender: { def: number; element?: string },
  skillMultiplier = 1.0,
  isCrit = false,
): { damage: number; isCrit: boolean; elementMult: number } {
  let dmg = attacker.atk * skillMultiplier;
  let crit = isCrit;

  if (!crit && Math.random() < attacker.critRate) {
    dmg *= attacker.critDmg;
    crit = true;
  } else if (crit) {
    dmg *= attacker.critDmg;
  }

  const elementTable: Record<string, Record<string, number>> = {
    fire: { ice: 1.5, phys: 1.2 },
    ice: { phys: 1.5 },
    light: { dark: 1.5 },
    dark: { light: 1.5 },
  };
  const eleMult = elementTable[attacker.element]?.[defender.element ?? 'phys'] ?? 1.0;
  dmg *= eleMult;

  dmg = Math.max(1, dmg - defender.def);

  return { damage: Math.floor(dmg), isCrit: crit, elementMult: eleMult };
}

// === SKILL COOLDOWN HELPERS ===
export function getSkillCooldown(user: IUser, skillId: string): number {
  return user.skillCooldowns?.get(skillId) ?? 0;
}

export function setSkillCooldown(user: IUser, skill: SkillData): void {
  if (!user.skillCooldowns) user.skillCooldowns = new Map();
  user.skillCooldowns.set(skill.id, skill.cooldownTurns);
}

export function tickSkillCooldowns(user: IUser): void {
  if (!user.skillCooldowns) return;
  for (const [id, turns] of user.skillCooldowns.entries()) {
    if (turns > 0) user.skillCooldowns.set(id, turns - 1);
  }
}

export function resetSkillCooldowns(user: IUser): void {
  user.skillCooldowns = new Map();
}

export function tickBuffs(user: IUser): void {
  user.buffs = user.buffs.filter((b) => {
    // Khusus buff battle: wajib pake turnsLeft
    if (b.battle) {
      if (b.turnsLeft === undefined) return false; // kalo nggak ada turnsLeft, hapus aja. Nggak boleh ada dummy
      b.turnsLeft -= 1;
      return b.turnsLeft >= 0;
    }
    // Buff passive: pake expires kayak biasa
    if (b.expires) {
      return b.expires.getTime() > Date.now();
    }
    // Kalo nggak ada turnsLeft & nggak ada expires, anggap invalid -> hapus
    return false;
  });
}
