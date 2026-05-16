import { getClass } from './classes';
import { getEquipment } from './equipment';
import { getPassiveSkills, getSkill } from './skills';
import type { IUser, IEquipmentStat } from '@nova/db';

export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  critRate: number; // 0.05 = 5%
  critDmg: number; // 2.0 = 200%
  element: 'phys' | 'fire' | 'ice' | 'light' | 'dark';
  activeBuffs: { type: string; value: number; expires: number }[];
  availableSkills: string[]; // skill IDs yang bisa dipake
}

// === HELPER: Gabungin semua stat dari equipment ===
function sumEquipmentStats(equipIds: (string | null)[]): IEquipmentStat {
  const total: IEquipmentStat = { atk: 0, hp: 0, def: 0, critRate: 0, critDmg: 0 };
  
  for (const id of equipIds) {
    if (!id) continue;
    const eq = getEquipment(id);
    if (!eq?.stats) continue;
    
    total.atk = (total.atk?? 0) + (eq.stats.atk?? 0);
    total.hp = (total.hp?? 0) + (eq.stats.hp?? 0);
    total.def = (total.def?? 0) + (eq.stats.def?? 0);
    total.critRate = (total.critRate?? 0) + (eq.stats.critRate?? 0);
    total.critDmg = (total.critDmg?? 0) + (eq.stats.critDmg?? 0);
    // element dari weapon = override, else keep default
    if (eq.slot === 'weapon' && eq.stats.element) {
      total.element = eq.stats.element;
    }
  }
  return total;
}

// === HELPER: Apply buff ke stat ===
function applyBuffs(base: number, buffs: IUser['buffs'], buffType: string): number {
  const now = Date.now();
  let multiplier = 1;
  
  for (const buff of buffs) {
    if (buff.type === buffType && buff.expires.getTime() > now) {
      multiplier += buff.value; // buff.value = 0.3 = +30%
    }
  }
  return Math.floor(base * multiplier);
}

// === HELPER: Apply passive skill ===
function applyPassives(baseStats: PlayerStats, user: IUser): PlayerStats {
  const passives = getPassiveSkills(user);
  const newStats = { ...baseStats };
  
  for (const passive of passives) {
    for (const effect of passive.effects) {
      if (effect.type === 'buff' && effect.value === 'passive:atk_per_hp_loss') {
        // Berserker: +1% ATK tiap 10% HP hilang
        const hpLostPercent = 1 - user.hp / user.maxHp;
        const atkBonus = Math.floor(hpLostPercent * 10) * 0.01; // 10% hp = +1% atk
        newStats.atk = Math.floor(newStats.atk * (1 + atkBonus));
      }
    }
  }
  return newStats;
}

// === MAIN FUNCTION: Dipake semua command ===
export function getPlayerStats(user: IUser): PlayerStats {
  const classData = getClass(user.class);
  
  // 1. BASE STAT dari class + level
  const baseAtk = (classData?.baseAtk?? 10) + Math.floor(user.level * 1.5);
  const baseHp = (classData?.baseHp?? 100) + Math.floor(user.level * 10);
  const baseCritRate = classData?.baseCritRate?? 0.05;
  
  let stats: PlayerStats = {
    hp: user.hp,
    maxHp: baseHp,
    atk: baseAtk,
    def: 0,
    critRate: baseCritRate,
    critDmg: 1.5, // default 150%
    element: 'phys',
    activeBuffs: [],
    availableSkills: [],
  };

  // 2. TAMBAH STAT DARI EQUIPMENT
  const equipIds = [
    user.equipped.weapon,
    user.equipped.helmet,
    user.equipped.armor,
    user.equipped.accessory,
  ];
  const eqStats = sumEquipmentStats(equipIds);
  
  stats.atk += eqStats.atk?? 0;
  stats.maxHp += eqStats.hp?? 0;
  stats.def += eqStats.def?? 0;
  stats.critRate += eqStats.critRate?? 0;
  stats.critDmg += eqStats.critDmg?? 0;
  if (eqStats.element) stats.element = eqStats.element;

  // 3. APPLY BUFF dari user.buffs
  stats.atk = applyBuffs(stats.atk, user.buffs, 'atk');
  stats.maxHp = applyBuffs(stats.maxHp, user.buffs, 'hp');
  
  // 4. APPLY PASSIVE SKILL
  stats = applyPassives(stats, user);

  // 5. SKILL YANG BISA DIPAKE
  if (classData?.skillId) {
    stats.availableSkills.push(classData.skillId);
  }
  // skill dari equipment
  for (const id of equipIds) {
    if (!id) continue;
    const eq = getEquipment(id);
    if (eq?.stats.grantsSkill) {
      stats.availableSkills.push(eq.stats.grantsSkill);
    }
  }

  // 6. CLAMP biar gak minus
  stats.hp = Math.max(0, Math.min(stats.hp, stats.maxHp));
  stats.critRate = Math.min(stats.critRate, 1); // max 100%
  stats.def = Math.max(0, stats.def);

  // 7. ACTIVE BUFFS buat UI
  const now = Date.now();
  stats.activeBuffs = user.buffs
    .filter(b => b.expires.getTime() > now)
    .map(b => ({ type: b.type, value: b.value, expires: b.expires.getTime() }));

  return stats;
}

// === DAMAGE CALC: Dipake di dungeon-battle, hunt, dll ===
export function calculateDamage(
  attacker: PlayerStats,
  defender: { def: number; element?: string },
  skillMultiplier = 1.0,
  isCrit = false
): number {
  let dmg = attacker.atk * skillMultiplier;
  
  // Crit
  if (isCrit || Math.random() < attacker.critRate) {
    dmg *= attacker.critDmg;
    isCrit = true;
  }
  
  // Element advantage: fire > ice > phys, light <-> dark
  const elementTable: Record<string, Record<string, number>> = {
    fire: { ice: 1.5, phys: 1.2 },
    ice: { phys: 1.5 },
    light: { dark: 1.5 },
    dark: { light: 1.5 },
  };
  const eleMult = elementTable[attacker.element]?.[defender.element?? 'phys']?? 1.0;
  dmg *= eleMult;
  
  // DEF reduction: 1 def = -1 damage, min 1
  dmg = Math.max(1, dmg - defender.def);
  
  return { damage: Math.floor(dmg), isCrit, elementMult: eleMult };
}
