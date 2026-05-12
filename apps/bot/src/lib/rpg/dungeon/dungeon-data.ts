export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

export const FLOOR_LORE: Record<number, string> = {
  1: 'Dasar menara. Udara lembab dan dipenuhi aroma lendir. Langkah pertamamu dimulai.',
  10: 'Ruangan bergetar. Tahta lendir raksasa menghalangi jalanmu naik.',
  11: 'Dinding mulai mengkristal. Kamu mendengar suara retakan dari dalam batu.',
  20: 'Sebuah jantung kristal berdenyut di tengah aula. Cahayanya menyilaukan.',
  21: 'Suhu turun drastis. Bisikan arwah terdengar dari celah dinding.',
  30: 'Kegelapan pekat menyelimuti. Sesuatu mengintaimu dari dalam void.',
  31: 'Panas menyengat. Aliran lava mengalir di sela lantai menara.',
  40: 'Raungan naga mengguncang menara. Bara api menari di udara.',
  41: 'Embun beku mulai terbentuk. Napasmu menguap jadi es.',
  50: 'Dingin mutlak. Waktu terasa berhenti di hadapan Warden Beku.',
  51: 'Kamu menembus awan. Langit bintang terbentang di dalam menara.',
  60: 'Konstelasi hidup bergerak di dinding. Mereka mengawasimu.',
  70: 'Gravitasi melemah. Pecahan planet melayang di sekitarmu.',
  75: 'Ruang hampa terbuka. Sesuatu memakan cahaya bintang di depanmu.',
  76: 'Aura keilahian terasa. Kamu mendekati puncak eksistensi.',
  90: 'Realita mulai retak. Suara dari luar dimensi memanggil namamu.',
  100: 'Puncak Menara. Singularitas dari segala bintang. Nova Prime menunggu.',
};

export const DUNGEON_MONSTERS = [
  { name: 'Slime Hijau', emoji: '🟢', base: 'slime' },
  { name: 'Slime Biru', emoji: '🔵', base: 'slime' },
  { name: 'Slime Merah', emoji: '🔴', base: 'slime' },
  { name: 'Slime Emas', emoji: '🟡', base: 'slime' },
  { name: 'Slime Bayangan', emoji: '⚫', base: 'slime' },
  { name: 'Slime Racun', emoji: '🟩', base: 'slime' },
  { name: 'Slime Listrik', emoji: '🟡⚡', base: 'slime' },
  { name: 'Slime Lava', emoji: '🔴🌋', base: 'slime' },
  { name: 'Slime Es', emoji: '🔵❄️', base: 'slime' },
  { name: 'Raja Slime', emoji: '👑🟣', base: 'slime' },
  { name: 'Golem Tanah', emoji: '🪨', base: 'golem' },
  { name: 'Golem Besi', emoji: '⚙️', base: 'golem' },
  { name: 'Golem Kristal', emoji: '🗿', base: 'golem' },
  { name: 'Golem Lava', emoji: '🌋', base: 'golem' },
  { name: 'Golem Es', emoji: '🧊', base: 'golem' },
  { name: 'Golem Pasir', emoji: '🏜️', base: 'golem' },
  { name: 'Golem Obsidian', emoji: '⬛', base: 'golem' },
  { name: 'Golem Emas', emoji: '🟨', base: 'golem' },
  { name: 'Golem Void', emoji: '🕳️', base: 'golem' },
  { name: 'Heart of Crystal', emoji: '💎', base: 'golem' },
  { name: 'Hantu Liar', emoji: '👻', base: 'specter' },
  { name: 'Arwah Gentayangan', emoji: '💀', base: 'specter' },
  { name: 'Specter Void', emoji: '🌫️', base: 'specter' },
  { name: 'Wraith Malam', emoji: '🌙', base: 'specter' },
  { name: 'Banshee Jerit', emoji: '😱', base: 'specter' },
  { name: 'Phantom Bayangan', emoji: '👤', base: 'specter' },
  { name: 'Poltergeist', emoji: '🌀', base: 'specter' },
  { name: 'Revenant', emoji: '🧟', base: 'specter' },
  { name: 'Shadow Fiend', emoji: '😈', base: 'specter' },
  { name: 'Void Reaper', emoji: '☠️', base: 'specter' },
  { name: 'Drake Muda', emoji: '🦎', base: 'drake' },
  { name: 'Drake Api', emoji: '🔥', base: 'drake' },
  { name: 'Drake Petir', emoji: '⚡', base: 'drake' },
  { name: 'Drake Es', emoji: '❄️🐉', base: 'drake' },
  { name: 'Wyvern Kuno', emoji: '🐲', base: 'drake' },
  { name: 'Drake Racun', emoji: '☠️🐉', base: 'drake' },
  { name: 'Drake Tanah', emoji: '🪨🐉', base: 'drake' },
  { name: 'Drake Angin', emoji: '🌪️🐉', base: 'drake' },
  { name: 'Drake Shadow', emoji: '🌑🐉', base: 'drake' },
  { name: 'Inferno Drake', emoji: '🔥🐉', base: 'drake' },
  { name: 'Warden Penjara', emoji: '⛓️', base: 'warden' },
  { name: 'Frost Warden', emoji: '❄️', base: 'warden' },
  { name: 'Flame Warden', emoji: '🔥', base: 'warden' },
  { name: 'Storm Warden', emoji: '🌩️', base: 'warden' },
  { name: 'Void Warden', emoji: '🕳️', base: 'warden' },
  { name: 'Earth Warden', emoji: '🌍', base: 'warden' },
  { name: 'Light Warden', emoji: '💡', base: 'warden' },
  { name: 'Blood Warden', emoji: '🩸', base: 'warden' },
  { name: 'Chaos Warden', emoji: '🌀', base: 'warden' },
  { name: 'Absolute Zero', emoji: '🧊', base: 'warden' },
  { name: 'Guardian Perak', emoji: '🥈', base: 'guardian' },
  { name: 'Guardian Emas', emoji: '🥇', base: 'guardian' },
  { name: 'Astral Guardian', emoji: '✨', base: 'guardian' },
  { name: 'Celestial Knight', emoji: '⚔️✨', base: 'guardian' },
  { name: 'Star Sentinel', emoji: '🌟', base: 'guardian' },
  { name: 'Lunar Guardian', emoji: '🌙✨', base: 'guardian' },
  { name: 'Solar Guardian', emoji: '☀️✨', base: 'guardian' },
  { name: 'Nebula Guardian', emoji: '🌌', base: 'guardian' },
  { name: 'Quantum Guardian', emoji: '⚛️', base: 'guardian' },
  { name: 'Titan Starforge', emoji: '🔨⭐', base: 'guardian' },
  { name: 'Void Walker', emoji: '🚶🕳️', base: 'guardian' },
  { name: 'Cosmic Horror', emoji: '👁️🌌', base: 'guardian' },
  { name: 'Galactic Serpent', emoji: '🐍🌌', base: 'guardian' },
  { name: 'Plasma Phantom', emoji: '⚡👻', base: 'guardian' },
  { name: 'Meteor Golem', emoji: '☄️🗿', base: 'guardian' },
  { name: 'Black Hole Fiend', emoji: '🕳️😈', base: 'guardian' },
  { name: 'Supernova Drake', emoji: '💥🐉', base: 'guardian' },
  { name: 'Comet Wraith', emoji: '☄️👻', base: 'guardian' },
  { name: 'Pulsar Knight', emoji: '💫⚔️', base: 'guardian' },
  { name: 'Dark Matter Beast', emoji: '⚫👹', base: 'guardian' },
  { name: 'Eclipse Specter', emoji: '🌑👻', base: 'guardian' },
  { name: 'Gravity Warden', emoji: '🌀⛓️', base: 'guardian' },
  { name: 'Rift Stalker', emoji: '🪓🕳️', base: 'guardian' },
  { name: 'Quasar Fiend', emoji: '💥😈', base: 'guardian' },
  { name: 'Star Eater', emoji: '🌌', base: 'guardian' },
  { name: 'Nebula Hydra', emoji: '🐍🌌', base: 'guardian' },
  { name: 'Cosmic Leviathan', emoji: '🐋🌌', base: 'guardian' },
  { name: 'Astral Phoenix', emoji: '🔥🕊️', base: 'guardian' },
  { name: 'Void Kraken', emoji: '🐙🕳️', base: 'guardian' },
  { name: 'Stellar Basilisk', emoji: '🐍⭐', base: 'guardian' },
  { name: 'Galaxy Behemoth', emoji: '🦖🌌', base: 'guardian' },
  { name: 'Photon Chimera', emoji: '💡🦁', base: 'guardian' },
  { name: 'Neutron Wyrm', emoji: '⚛️🐉', base: 'guardian' },
  { name: 'Event Horizon', emoji: '🕳️🌑', base: 'guardian' },
  { name: 'Celestial Archon', emoji: '👼✨', base: 'guardian' },
  { name: 'Omega Sentinel', emoji: 'Ω🌟', base: 'guardian' },
  { name: 'Chrono Warden', emoji: '⏳⛓️', base: 'guardian' },
  { name: 'Singularity', emoji: '💫🕳️', base: 'guardian' },
  { name: 'Aether Drake', emoji: '🌫️🐉', base: 'guardian' },
  { name: 'Primeval Star', emoji: '⭐🌳', base: 'guardian' },
  { name: 'Entropy Fiend', emoji: '🌀😈', base: 'guardian' },
  { name: 'Genesis Golem', emoji: '🌍🗿', base: 'guardian' },
  { name: 'Oblivion Wraith', emoji: '🕳️👻', base: 'guardian' },
  { name: 'Zenith Guardian', emoji: '🔝✨', base: 'guardian' },
  { name: 'Apocalypse', emoji: '☢️💀', base: 'guardian' },
  { name: 'Origin Specter', emoji: '🌌👻', base: 'guardian' },
  { name: 'Infinite Void', emoji: '♾️🕳️', base: 'guardian' },
  { name: 'The Creator', emoji: '👁️🌟', base: 'guardian' },
  { name: 'The Destroyer', emoji: '💀🌌', base: 'guardian' },
  { name: 'Nova Prime', emoji: '🌟', base: 'guardian' },
] as const;

export const BOSSES: Record<number, { name: string; emoji: string; title: string }> = {
  10: { name: 'Raja Slime', emoji: '👑🟣', title: 'Raja Lendir' },
  20: { name: 'Heart of Crystal', emoji: '💎', title: 'Jantung Golem' },
  30: { name: 'Void Reaper', emoji: '☠️', title: 'Penuai Void' },
  40: { name: 'Inferno Drake', emoji: '🔥🐉', title: 'Naga Api' },
  50: { name: 'Absolute Zero', emoji: '🧊', title: 'Warden Beku' },
  75: { name: 'Star Eater', emoji: '🌌', title: 'Pemakan Bintang' },
  100: { name: 'Nova Prime', emoji: '🌟', title: 'Puncak Menara' },
};

export const DUNGEON_DROPS: Record<
  string,
  { id: string; name: string; emoji: string; rarity: Rarity; sell: number }[]
> = {
  slime: [
    { id: 'star_dust', name: 'Star Dust', emoji: '✨', rarity: 'Common', sell: 15 },
    { id: 'slime_core', name: 'Slime Core', emoji: '🟣', rarity: 'Uncommon', sell: 40 },
    { id: 'slime_crown', name: 'Slime Crown', emoji: '👑', rarity: 'Rare', sell: 150 },
  ],
  golem: [
    { id: 'crystal_shard', name: 'Crystal Shard', emoji: '🔹', rarity: 'Uncommon', sell: 55 },
    { id: 'golem_heart', name: 'Golem Heart', emoji: '🗿', rarity: 'Rare', sell: 120 },
    { id: 'obsidian_plate', name: 'Obsidian Plate', emoji: '⬛', rarity: 'Epic', sell: 280 },
  ],
  specter: [
    { id: 'void_essence', name: 'Void Essence', emoji: '🌫️', rarity: 'Rare', sell: 150 },
    { id: 'soul_wisp', name: 'Soul Wisp', emoji: '👻', rarity: 'Epic', sell: 300 },
    { id: 'reaper_scythe', name: 'Reaper Scythe', emoji: '☠️', rarity: 'Epic', sell: 450 },
  ],
  drake: [
    { id: 'drake_scale', name: 'Drake Scale', emoji: '🐲', rarity: 'Rare', sell: 180 },
    { id: 'inferno_fang', name: 'Inferno Fang', emoji: '🦷', rarity: 'Epic', sell: 350 },
    { id: 'dragon_heart', name: 'Dragon Heart', emoji: '❤️‍🔥', rarity: 'Legendary', sell: 800 },
  ],
  warden: [
    { id: 'frost_crystal', name: 'Frost Crystal', emoji: '❄️', rarity: 'Epic', sell: 400 },
    { id: 'warden_chain', name: 'Warden Chain', emoji: '⛓️', rarity: 'Epic', sell: 500 },
    { id: 'absolute_shard', name: 'Absolute Shard', emoji: '🧊💎', rarity: 'Legendary', sell: 950 },
  ],
  guardian: [
    { id: 'astral_fragment', name: 'Astral Fragment', emoji: '💫', rarity: 'Epic', sell: 500 },
    { id: 'star_core', name: 'Star Core', emoji: '🌟', rarity: 'Legendary', sell: 1200 },
    { id: 'nebula_silk', name: 'Nebula Silk', emoji: '🌌', rarity: 'Legendary', sell: 1500 },
    { id: 'quantum_orb', name: 'Quantum Orb', emoji: '⚛️', rarity: 'Legendary', sell: 2000 },
    { id: 'nova_essence', name: 'Nova Essence', emoji: '💥🌟', rarity: 'Legendary', sell: 3000 },
  ],
};

export function getMonster(floor: number) {
  const boss = BOSSES[floor];
  if (boss) {
    const baseData = DUNGEON_MONSTERS.find((m) => m.name === boss.name);
    return { ...boss, isBoss: true, base: baseData?.base ?? 'guardian', title: boss.title };
  }
  const monster = DUNGEON_MONSTERS[floor - 1] ?? DUNGEON_MONSTERS[0];
  return { ...monster, isBoss: false, title: monster.name };
}

export function getFloorLore(floor: number): string {
  const loreFloor = Object.keys(FLOOR_LORE)
    .map(Number)
    .reverse()
    .find((f) => floor >= f);
  return FLOOR_LORE[loreFloor ?? 1];
}
