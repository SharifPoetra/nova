export type DungeonEvent = {
  id: string;
  type: 'battle' | 'treasure' | 'trap' | 'heal' | 'merchant' | 'lore' | 'puzzle';
  weight: number;
  text: string;
  effect?: { hp?: number; gold?: number; stamina?: number; item?: string };
};

export const DUNGEON_EVENTS: Record<string, DungeonEvent[]> = {
  // ZONA 1: Lantai 1-20 - Reruntuhan Bawah Tanah
  ruins: [
    {
      id: 'goblin_ambush',
      type: 'battle',
      weight: 55,
      text: 'Sekawanan Goblin menyergap dari bayangan!',
    },
    {
      id: 'old_chest',
      type: 'treasure',
      weight: 20,
      text: 'Peti kayu tua berdebu',
      effect: { gold: 50 },
    },
    {
      id: 'spike_trap',
      type: 'trap',
      weight: 10,
      text: 'Lantai runtuh! Paku berkarat',
      effect: { hp: -12 },
    },
    {
      id: 'healing_herb',
      type: 'heal',
      weight: 8,
      text: 'Kamu menemukan lumut bercahaya',
      effect: { hp: 25 },
    },
    {
      id: 'rune_puzzle',
      type: 'puzzle',
      weight: 5,
      text: 'Teka-teki rune kuno',
      effect: { gold: 100 },
    },
    {
      id: 'wounded_adventurer',
      type: 'lore',
      weight: 2,
      text: '"Jangan ke lantai 10..." bisiknya',
    },
  ],

  // ZONA 2: Lantai 21-40 - Tambang Kristal
  mines: [
    {
      id: 'crystal_crawler',
      type: 'battle',
      weight: 50,
      text: 'Crystal Crawler merayap di dinding!',
    },
    {
      id: 'crystal_vein',
      type: 'treasure',
      weight: 22,
      text: 'Urat kristal biru',
      effect: { item: 'crystal_shard' },
    },
    {
      id: 'gas_trap',
      type: 'trap',
      weight: 12,
      text: 'Gas beracun bocor',
      effect: { hp: -18, stamina: -5 },
    },
    {
      id: 'mine_cart',
      type: 'treasure',
      weight: 10,
      text: 'Gerobak tambang terbalik',
      effect: { gold: 120 },
    },
    {
      id: 'echo_fountain',
      type: 'heal',
      weight: 4,
      text: 'Air bergema menyembuhkan',
      effect: { hp: 40 },
    },
    {
      id: 'foreman_ghost',
      type: 'lore',
      weight: 2,
      text: 'Hantu mandor: "Mereka menggali terlalu dalam"',
    },
  ],

  // ZONA 3: Lantai 41-60 - Perpustakaan Terlarang
  library: [
    { id: 'living_book', type: 'battle', weight: 45, text: 'Buku hidup menyerang!' },
    {
      id: 'forbidden_tome',
      type: 'treasure',
      weight: 20,
      text: 'Kitab terlarang',
      effect: { item: 'arcane_page' },
    },
    { id: 'ink_trap', type: 'trap', weight: 15, text: 'Tinta terkutuk', effect: { hp: -20 } },
    {
      id: 'knowledge_puzzle',
      type: 'puzzle',
      weight: 12,
      text: 'Teka-teki bintang',
      effect: { gold: 200 },
    },
    {
      id: 'librarian',
      type: 'merchant',
      weight: 5,
      text: 'Pustakawan menjual scroll',
      effect: { gold: -150 },
    },
    { id: 'star_map', type: 'lore', weight: 3, text: 'Peta menunjukkan lantai 100 adalah...' },
  ],

  // ZONA 4: Lantai 61-80 - Kuil Langit
  temple: [
    { id: 'temple_guardian', type: 'battle', weight: 50, text: 'Penjaga kuil bangkit!' },
    {
      id: 'offering',
      type: 'treasure',
      weight: 18,
      text: 'Persembahan dewa',
      effect: { gold: 300, item: 'sky_feather' },
    },
    { id: 'light_trial', type: 'puzzle', weight: 15, text: 'Ujian cahaya', effect: { hp: 50 } },
    {
      id: 'cursed_altar',
      type: 'trap',
      weight: 10,
      text: 'Altar menghisap jiwa',
      effect: { hp: -30 },
    },
    {
      id: 'angel_heal',
      type: 'heal',
      weight: 5,
      text: 'Bulu malaikat jatuh',
      effect: { hp: 60, stamina: 10 },
    },
    { id: 'prophecy', type: 'lore', weight: 2, text: '"Bintang keseratus akan jatuh"' },
  ],

  // ZONA 5: Lantai 81-100 - Puncak Bintang
  summit: [
    { id: 'void_spawn', type: 'battle', weight: 55, text: 'Makhluk void muncul!' },
    {
      id: 'star_chest',
      type: 'treasure',
      weight: 20,
      text: 'Peti bintang',
      effect: { gold: 500, item: 'star_fragment' },
    },
    {
      id: 'gravity_trap',
      type: 'trap',
      weight: 12,
      text: 'Gravitasi hancur',
      effect: { hp: -40, stamina: -10 },
    },
    { id: 'wish', type: 'puzzle', weight: 8, text: 'Sumur harapan', effect: { gold: 1000 } },
    {
      id: 'final_heal',
      type: 'heal',
      weight: 3,
      text: 'Cahaya bintang terakhir',
      effect: { hp: 100 },
    },
    { id: 'astral_memory', type: 'lore', weight: 2, text: 'Kamu melihat asal-usul tower...' },
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
  const zone = getZone(floor);
  const pool = DUNGEON_EVENTS[zone];
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const ev of pool) {
    if ((r -= ev.weight) <= 0) return ev;
  }
  return pool[0];
}
