import type { IItem } from '@nova/db';

export type DungeonEvent = {
  id: string;
  type: 'battle' | 'treasure' | 'trap' | 'heal' | 'merchant' | 'lore' | 'puzzle';
  weight: number;
  effect?: { hp?: number; gold?: number; stamina?: number; item?: string };
};

export const EVENT_ITEM_DEFS: Record<
  string,
  Pick<IItem, 'emoji' | 'sellPrice' | 'type' | 'rarity'>
> = {
  crystal_shard: { emoji: '🔷', sellPrice: 25, type: 'material', rarity: 'Uncommon' },
  arcane_page: { emoji: '📜', sellPrice: 50, type: 'material', rarity: 'Rare' },
  sky_feather: { emoji: '🪶', sellPrice: 75, type: 'material', rarity: 'Rare' },
  star_fragment: { emoji: '🌟', sellPrice: 150, type: 'material', rarity: 'Epic' },
};

export const DUNGEON_EVENTS: Record<string, DungeonEvent[]> = {
  ruins: [
    { id: 'goblin_ambush', type: 'battle', weight: 55 },
    { id: 'old_chest', type: 'treasure', weight: 20, effect: { gold: 50 } },
    { id: 'spike_trap', type: 'trap', weight: 10, effect: { hp: -12 } },
    { id: 'healing_herb', type: 'heal', weight: 8, effect: { hp: 25 } },
    { id: 'rune_puzzle', type: 'puzzle', weight: 5, effect: { gold: 100 } },
    { id: 'wounded_adventurer', type: 'lore', weight: 2 },
  ],
  mines: [
    { id: 'crystal_crawler', type: 'battle', weight: 50 },
    { id: 'crystal_vein', type: 'treasure', weight: 22, effect: { item: 'crystal_shard' } },
    { id: 'gas_trap', type: 'trap', weight: 12, effect: { hp: -18, stamina: -5 } },
    { id: 'mine_cart', type: 'treasure', weight: 10, effect: { gold: 120 } },
    { id: 'echo_fountain', type: 'heal', weight: 4, effect: { hp: 40 } },
    { id: 'foreman_ghost', type: 'lore', weight: 2 },
    { id: 'dwarf_trader', type: 'merchant', weight: 4, effect: { gold: -120 } },
  ],
  library: [
    { id: 'living_book', type: 'battle', weight: 45 },
    { id: 'forbidden_tome', type: 'treasure', weight: 20, effect: { item: 'arcane_page' } },
    { id: 'ink_trap', type: 'trap', weight: 15, effect: { hp: -20 } },
    { id: 'knowledge_puzzle', type: 'puzzle', weight: 12, effect: { gold: 200 } },
    { id: 'librarian', type: 'merchant', weight: 5, effect: { gold: -150 } },
    { id: 'star_map', type: 'lore', weight: 3 },
  ],
  temple: [
    { id: 'temple_guardian', type: 'battle', weight: 50 },
    { id: 'offering', type: 'treasure', weight: 18, effect: { gold: 300, item: 'sky_feather' } },
    { id: 'light_trial', type: 'puzzle', weight: 15, effect: { hp: 50 } },
    { id: 'cursed_altar', type: 'trap', weight: 10, effect: { hp: -30 } },
    { id: 'angel_heal', type: 'heal', weight: 5, effect: { hp: 60, stamina: 10 } },
    { id: 'prophecy', type: 'lore', weight: 2 },
    { id: 'shrine_maiden', type: 'merchant', weight: 4, effect: { gold: -200 } },
  ],
  summit: [
    { id: 'void_spawn', type: 'battle', weight: 55 },
    {
      id: 'star_chest',
      type: 'treasure',
      weight: 20,
      effect: { gold: 500, item: 'star_fragment' },
    },
    { id: 'gravity_trap', type: 'trap', weight: 12, effect: { hp: -40, stamina: -10 } },
    { id: 'wish', type: 'puzzle', weight: 8, effect: { gold: 1000 } },
    { id: 'final_heal', type: 'heal', weight: 3, effect: { hp: 100 } },
    { id: 'astral_memory', type: 'lore', weight: 2 },
    { id: 'star_merchant', type: 'merchant', weight: 3, effect: { gold: -300 } },
  ],
};

export function getZone(floor: number): keyof typeof DUNGEON_EVENTS {
  if (floor <= 20) return 'ruins';
  if (floor <= 40) return 'mines';
  if (floor <= 60) return 'library';
  if (floor <= 80) return 'temple';
  return 'summit';
}

export function rollEvent(floor: number): DungeonEvent {
  const pool = DUNGEON_EVENTS[getZone(floor)];
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const ev of pool) if ((r -= ev.weight) <= 0) return ev;
  return pool[0];
}
