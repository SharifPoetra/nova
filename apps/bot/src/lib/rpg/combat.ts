import { getClass } from './classes.ts';
import { getPassiveSkills, type SkillData } from './skills.ts';
import { Item, type Element, type IUser, type IItem, type IEquipmentStat } from '@nova/db';

export const elementTable: Record<Element, Partial<Record<Element, number>>> = {
  physical: { light: 1.2, dark: 1.2 },
  fire: { ice: 1.5, wind: 1.5, physical: 0.8, water: 0.7, earth: 0.7 },
  water: { fire: 1.5, earth: 1.5, physical: 0.8, lightning: 0.7, wind: 0.7 },
  earth: { lightning: 1.5, fire: 1.5, physical: 0.8, wind: 0.7, ice: 0.7 },
  wind: { earth: 1.5, water: 1.5, physical: 0.8, ice: 0.7, lightning: 0.7 },
  ice: { wind: 1.5, lightning: 1.5, physical: 0.8, fire: 0.7, earth: 0.7 },
  lightning: { water: 1.5, ice: 1.5, physical: 0.8, earth: 0.7, fire: 0.7 },
  light: { dark: 1.5, physical: 0.9 },
  dark: { light: 1.5, physical: 0.9 },
};

export const ELEMENT_EMOJI: Record<Element, string> = {
  physical: '⚔️',
  fire: '🔥',
  water: '💧',
  earth: '🌱',
  wind: '💨',
  ice: '❄️',
  lightning: '⚡',
  light: '✨',
  dark: '🌑',
};

export interface PlayerStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  critRate: number; // 0.05 = 5%
  critDmg: number; // 2.0 = 200%
  element: Element;
  activeBuffs: { type: string; value: number; turnsLeft: number }[];
  availableSkills: string[]; // skill IDs yang bisa dipake
  dodge?: number;
  flags?: Record<string, boolean>;
}

// === HELPER: Gabungin semua stat dari equipment ===
async function sumEquipmentStats(equipIds: (string | null)[]): Promise<{ total: IEquipmentStat; items: IItem[] }> {
  const total: IEquipmentStat = { atk: 0, hp: 0, def: 0, critRate: 0, critDmg: 0 };

  const validIds = equipIds.filter(Boolean) as string[];
  if (validIds.length === 0) return { total, items: [] };

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
  return { total, items };
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
// FORMAT PASSIVE YANG VALID:
// effect.value harus string dengan format: 'passive:stat:condition:value'
//
// STAT yang didukung:
// - atk : tambah flat ATK (contoh: 5)
// - atk_pct : tambah % ATK (contoh: 0.1 = +10%)
// - def : tambah flat DEF
// - hp_pct : tambah % maxHp
// - critRate : tambah crit rate (0.15 = +15%)
// - critDmg : tambah crit damage (0.2 = +20%)
// - dodge : tambah dodge chance (untuk rogue)
// - flag : set flag khusus (untuk efek yang diproses di battle, bukan stat)
//
// CONDITION yang didukung:
// - always : selalu aktif
// - hp>0.7 : HP di atas 70%
// - hp>0.5 : HP di atas 50%
// - hp<0.5 : HP di bawah 50%
// - hp<0.3 : HP di bawah 30%
// - hp_loss : scale dengan HP yang hilang (dihitung per 10% HP hilang)
//
// VALUE:
// - angka biasa: '0.15'
// - per level: '0.01*level' (akan jadi 0.01 * user.level)
// - untuk hp_loss: value dikali jumlah step (1 step = 10% HP hilang)
//
// CONTOH:
// 'passive:critRate:hp>0.7:0.15' -> +15% crit kalau HP >70%
// 'passive:dodge:hp>0.7:0.10' -> +10% dodge kalau HP >70%
// 'passive:atk_pct:always:0.01*level' -> +1% ATK per level
// 'passive:atk_pct:hp_loss:0.01' -> +1% ATK per 10% HP hilang (berserker)
// 'passive:atk_pct:hp_loss:0.005*level' -> +0.5% ATK per level per 10% HP hilang
// 'passive:flag:always:poison_blades' -> set flag untuk poison
// 'passive:flag:always:mana_shield' -> set flag untuk mana shield
export function applyPassives(baseStats: PlayerStats, user: IUser): PlayerStats {
  const passives = getPassiveSkills(user) ?? [];
  const newStats = { ...baseStats };
  if (!newStats.availableSkills) newStats.availableSkills = [];
  if (!newStats.flags) newStats.flags = {};

  for (const passive of passives) {
    for (const effect of passive.effects) {
      if (effect.type !== 'buff') continue;
      if (typeof effect.value !== 'string' || !effect.value.startsWith('passive:')) continue;

      const [, stat, condition, valueRaw] = effect.value.split(':');
      if (!stat || !condition || !valueRaw) continue;

      // cek kondisi
      const hpPct = newStats.hp / newStats.maxHp;
      let active: boolean;
      switch (condition) {
        case 'always':
          active = true;
          break;
        case 'hp>0.7':
          active = hpPct > 0.7;
          break;
        case 'hp>0.5':
          active = hpPct > 0.5;
          break;
        case 'hp<0.5':
          active = hpPct < 0.5;
          break;
        case 'hp<0.3':
          active = hpPct < 0.3;
          break;
        case 'hp_loss':
          active = true;
          break;
        default:
          active = true;
      }
      if (!active) continue;

      // hitung value (support *level)
      let value = 0;
      if (condition === 'hp_loss') {
        // valueRaw bisa '0.01' (1% per 10%) atau '0.02*level' (2% per 10% per level)
        const hpLostPercent = 1 - hpPct;
        const steps = Math.floor(hpLostPercent * 10 + 1e-6); // 0-10 step, tambah epsilon biar 0.9999 jadi 1

        let baseValue: number;
        if (valueRaw.includes('*level')) {
          const base = parseFloat(valueRaw.replace('*level', ''));
          baseValue = base * user.level;
        } else {
          baseValue = parseFloat(valueRaw);
        }
        value = baseValue * steps;
      } else if (valueRaw.includes('*level')) {
        const base = parseFloat(valueRaw.replace('*level', ''));
        value = base * user.level;
      } else if (!isNaN(parseFloat(valueRaw))) {
        value = parseFloat(valueRaw);
      }

      // apply ke stat
      switch (stat) {
        case 'atk':
          newStats.atk += Math.floor(value);
          break;
        case 'atk_pct':
          newStats.atk = Math.floor(newStats.atk * (1 + value));
          break;
        case 'def':
          newStats.def += Math.floor(value);
          break;
        case 'hp_pct':
          newStats.maxHp = Math.floor(newStats.maxHp * (1 + value));
          newStats.hp = Math.min(newStats.hp, newStats.maxHp);
          break;
        case 'critRate':
          newStats.critRate += value;
          break;
        case 'critDmg':
          newStats.critDmg += value;
          break;
        case 'dodge':
          newStats.dodge = (newStats.dodge ?? 0) + value;
          break;
        case 'flag':
          // untuk passive yang bukan stat, simpan sebagai flag
          newStats.flags[valueRaw] = true;
          break;
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
    element: 'physical',
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
  const { total: eqStats, items: equippedItems } = await sumEquipmentStats(equipIds);

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
  defender: { def: number; element?: Element },
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

  const eleMult = elementTable[attacker.element]?.[defender.element ?? 'physical'] ?? 1.0;
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
