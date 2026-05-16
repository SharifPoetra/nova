import type { EquipmentSlot, IEquipmentStat } from '@nova/db';

export interface EquipmentData {
  id: string;
  name: string;
  emoji: string;
  type: 'equipment';
  slot: EquipmentSlot;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  sellPrice: number;
  description: string;
  stats: IEquipmentStat;
}

// === PHASE 0.3: 6 WEAPON SESUAI ROADMAP ===
export const EQUIPMENTS: Record<string, EquipmentData> = {
  // === UNCOMMON TIER: Early Game - MATCH ROADMAP ===
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Sword',
    emoji: '⚔️',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 45,
    description: 'Pedang besi standar warrior. Balance ATK.',
    stats: { atk: 12 },
  },
  mage_staff: {
    id: 'mage_staff',
    name: 'Mage Staff',
    emoji: '🪄',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 50,
    description: 'Tongkat mage. Naikin ATK + crit dikit buat early.',
    stats: { atk: 10, critRate: 0.05 },
  },
  hunter_bow: {
    id: 'hunter_bow',
    name: 'Hunter Bow',
    emoji: '🏹',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 70,
    description: 'Busur pemburu. Crit damage tinggi buat rogue.',
    stats: { atk: 15, critDmg: 1.8 },
  },

  // === RARE TIER: Mid Game ===
  slime_crown: {
    id: 'slime_crown',
    name: 'Slime Crown',
    emoji: '👑',
    type: 'equipment',
    slot: 'helmet',
    rarity: 'Rare',
    sellPrice: 150,
    description: 'Mahkota asli Raja Slime. Lengket tapi bawa hoki + HP.',
    stats: { hp: 20, critRate: 0.05 },
  },

  // === EPIC TIER: Boss Drop ===
  reaper_scythe: {
    id: 'reaper_scythe',
    name: 'Reaper Scythe',
    emoji: '☠️',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Epic',
    sellPrice: 450,
    description: 'Sabit Void Reaper. Crit monster. Drop dari Boss Floor 30.',
    stats: { atk: 25, critRate: 0.1, critDmg: 2.0 },
  },
  obsidian_plate: {
    id: 'obsidian_plate',
    name: 'Obsidian Plate',
    emoji: '⬛',
    type: 'equipment',
    slot: 'armor',
    rarity: 'Epic',
    sellPrice: 280,
    description: 'Pelat obsidian dari Heart of Crystal. DEF + HP tebel.',
    stats: { hp: 50, def: 5 },
  },
};

export function getEquipment(id: string): EquipmentData | null {
  return EQUIPMENTS[id] ?? null;
}

export function getAllEquipments(): EquipmentData[] {
  return Object.values(EQUIPMENTS);
}

export function getEquipmentsBySlot(slot: EquipmentSlot): EquipmentData[] {
  return getAllEquipments().filter((e) => e.slot === slot);
}
