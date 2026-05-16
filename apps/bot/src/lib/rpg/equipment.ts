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

export const EQUIPMENTS: Record<string, EquipmentData> = {
  // === UNCOMMON TIER: Early Game ===
  goblin_dagger: {
    id: 'goblin_dagger',
    name: 'Belati Karat',
    emoji: '🗡️',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 40,
    description: 'Belati curian goblin. Ringan, cocok buat rogue. Crit rate naik dikit.',
    stats: { atk: 8, critRate: 0.03 },
  },
  rusted_sword: {
    id: 'rusted_sword',
    name: 'Pedang Karat',
    emoji: '⚔️',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 45,
    description: 'Pedang prajurit skeleton. Masih bisa diasah. Base weapon warrior.',
    stats: { atk: 12 },
  },
  war_axe: {
    id: 'war_axe',
    name: 'Kapak Perang',
    emoji: '🪓',
    type: 'equipment',
    slot: 'weapon',
    rarity: 'Uncommon',
    sellPrice: 70,
    description: 'Kapak orc berserker. Berat tapi kalau crit sakit banget.',
    stats: { atk: 18, critDmg: 1.8 },
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
  return EQUIPMENTS[id]?? null;
}

export function getAllEquipments(): EquipmentData[] {
  return Object.values(EQUIPMENTS);
}

export function getEquipmentsBySlot(slot: EquipmentSlot): EquipmentData[] {
  return getAllEquipments().filter(e => e.slot === slot);
}
