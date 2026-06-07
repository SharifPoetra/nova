import type { IEquipmentStat, EquipmentSlot, Element } from '@nova/db';
import type { TFunction } from 'i18next';
import type { Rarity } from '../../utils.ts';
import { EQUIPMENTS } from '../equipments.ts';
import { i18nLore } from '../../i18n/display.ts';

export type DropItem = {
  id: string;
  emoji: string;
  rarity: Rarity;
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  effects?: { type: 'heal' | 'stamina' | 'mana' | 'buff'; value: number }[];
  slot?: EquipmentSlot;
  stats?: IEquipmentStat;
};

type MonsterData = {
  id: string;
  emoji: string;
  base: string;
  element: Element;
};

export const DUNGEON_MONSTERS: MonsterData[] = [
  // slime (10)
  { id: 'green_slime', emoji: '🟢', base: 'slime', element: 'earth' },
  { id: 'blue_slime', emoji: '🔵', base: 'slime', element: 'water' },
  { id: 'red_slime', emoji: '🔴', base: 'slime', element: 'fire' },
  { id: 'gold_slime', emoji: '🟡', base: 'slime', element: 'light' },
  { id: 'shadow_slime', emoji: '⚫', base: 'slime', element: 'dark' },
  { id: 'poison_slime', emoji: '🟩', base: 'slime', element: 'earth' },
  { id: 'electric_slime', emoji: '🟡⚡', base: 'slime', element: 'lightning' },
  { id: 'lava_slime', emoji: '🔴🌋', base: 'slime', element: 'fire' },
  { id: 'ice_slime', emoji: '🔵❄️', base: 'slime', element: 'ice' },
  { id: 'slime_king', emoji: '👑🟣', base: 'slime', element: 'dark' },

  // golem (10)
  { id: 'earth_golem', emoji: '🪨', base: 'golem', element: 'earth' },
  { id: 'iron_golem', emoji: '⚙️', base: 'golem', element: 'physical' },
  { id: 'crystal_golem', emoji: '🗿', base: 'golem', element: 'light' },
  { id: 'lava_golem', emoji: '🌋', base: 'golem', element: 'fire' },
  { id: 'ice_golem', emoji: '🧊', base: 'golem', element: 'ice' },
  { id: 'sand_golem', emoji: '🏜️', base: 'golem', element: 'earth' },
  { id: 'obsidian_golem', emoji: '⬛', base: 'golem', element: 'dark' },
  { id: 'gold_golem', emoji: '🟨', base: 'golem', element: 'light' },
  { id: 'void_golem', emoji: '🕳️', base: 'golem', element: 'dark' },
  { id: 'heart_of_crystal', emoji: '💎', base: 'golem', element: 'light' },

  // specter (10)
  { id: 'wild_ghost', emoji: '👻', base: 'specter', element: 'dark' },
  { id: 'wandering_spirit', emoji: '💀', base: 'specter', element: 'dark' },
  { id: 'void_specter', emoji: '🌫️', base: 'specter', element: 'dark' },
  { id: 'night_wraith', emoji: '🌙', base: 'specter', element: 'dark' },
  { id: 'screaming_banshee', emoji: '😱', base: 'specter', element: 'dark' },
  { id: 'shadow_phantom', emoji: '👤', base: 'specter', element: 'dark' },
  { id: 'poltergeist', emoji: '🌀', base: 'specter', element: 'wind' },
  { id: 'revenant', emoji: '🧟', base: 'specter', element: 'dark' },
  { id: 'shadow_fiend', emoji: '😈', base: 'specter', element: 'dark' },
  { id: 'void_reaper', emoji: '☠️', base: 'specter', element: 'dark' },

  // drake (10)
  { id: 'young_drake', emoji: '🦎', base: 'drake', element: 'physical' },
  { id: 'fire_drake', emoji: '🔥', base: 'drake', element: 'fire' },
  { id: 'lightning_drake', emoji: '⚡', base: 'drake', element: 'lightning' },
  { id: 'ice_drake', emoji: '❄️🐉', base: 'drake', element: 'ice' },
  { id: 'ancient_wyvern', emoji: '🐲', base: 'drake', element: 'wind' },
  { id: 'poison_drake', emoji: '☠️🐉', base: 'drake', element: 'earth' },
  { id: 'earth_drake', emoji: '🪨🐉', base: 'drake', element: 'earth' },
  { id: 'wind_drake', emoji: '🌪️🐉', base: 'drake', element: 'wind' },
  { id: 'shadow_drake', emoji: '🌑🐉', base: 'drake', element: 'dark' },
  { id: 'inferno_drake', emoji: '🔥🐉', base: 'drake', element: 'fire' },

  // warden (10)
  { id: 'prison_warden', emoji: '⛓️', base: 'warden', element: 'physical' },
  { id: 'frost_warden', emoji: '❄️', base: 'warden', element: 'ice' },
  { id: 'flame_warden', emoji: '🔥', base: 'warden', element: 'fire' },
  { id: 'storm_warden', emoji: '🌩️', base: 'warden', element: 'lightning' },
  { id: 'void_warden', emoji: '🕳️', base: 'warden', element: 'dark' },
  { id: 'earth_warden', emoji: '🌍', base: 'warden', element: 'earth' },
  { id: 'light_warden', emoji: '💡', base: 'warden', element: 'light' },
  { id: 'blood_warden', emoji: '🩸', base: 'warden', element: 'dark' },
  { id: 'chaos_warden', emoji: '🌀', base: 'warden', element: 'dark' },
  { id: 'absolute_zero', emoji: '🧊', base: 'warden', element: 'ice' },

  // guardian (50)
  { id: 'silver_guardian', emoji: '🥈', base: 'guardian', element: 'light' },
  { id: 'gold_guardian', emoji: '🥇', base: 'guardian', element: 'light' },
  { id: 'astral_guardian', emoji: '✨', base: 'guardian', element: 'light' },
  { id: 'celestial_knight', emoji: '⚔️✨', base: 'guardian', element: 'light' },
  { id: 'star_sentinel', emoji: '🌟', base: 'guardian', element: 'light' },
  { id: 'lunar_guardian', emoji: '🌙✨', base: 'guardian', element: 'dark' },
  { id: 'solar_guardian', emoji: '☀️✨', base: 'guardian', element: 'light' },
  { id: 'nebula_guardian', emoji: '🌌', base: 'guardian', element: 'dark' },
  { id: 'quantum_guardian', emoji: '⚛️', base: 'guardian', element: 'physical' },
  { id: 'titan_starforge', emoji: '🔨⭐', base: 'guardian', element: 'physical' },
  { id: 'void_walker', emoji: '🚶🕳️', base: 'guardian', element: 'dark' },
  { id: 'cosmic_horror', emoji: '👁️🌌', base: 'guardian', element: 'dark' },
  { id: 'galactic_serpent', emoji: '🐍🌌', base: 'guardian', element: 'dark' },
  { id: 'plasma_phantom', emoji: '⚡👻', base: 'guardian', element: 'lightning' },
  { id: 'meteor_golem', emoji: '☄️🗿', base: 'guardian', element: 'fire' },
  { id: 'black_hole_fiend', emoji: '🕳️😈', base: 'guardian', element: 'dark' },
  { id: 'supernova_drake', emoji: '💥🐉', base: 'guardian', element: 'fire' },
  { id: 'comet_wraith', emoji: '☄️👻', base: 'guardian', element: 'ice' },
  { id: 'pulsar_knight', emoji: '💫⚔️', base: 'guardian', element: 'lightning' },
  { id: 'dark_matter_beast', emoji: '⚫👹', base: 'guardian', element: 'dark' },
  { id: 'eclipse_specter', emoji: '🌑👻', base: 'guardian', element: 'dark' },
  { id: 'gravity_warden', emoji: '🌀⛓️', base: 'guardian', element: 'dark' },
  { id: 'rift_stalker', emoji: '🪓🕳️', base: 'guardian', element: 'dark' },
  { id: 'quasar_fiend', emoji: '💥😈', base: 'guardian', element: 'light' },
  { id: 'star_eater', emoji: '🌌', base: 'guardian', element: 'dark' },
  { id: 'nebula_hydra', emoji: '🐍🌌', base: 'guardian', element: 'water' },
  { id: 'cosmic_leviathan', emoji: '🐋🌌', base: 'guardian', element: 'water' },
  { id: 'astral_phoenix', emoji: '🔥🕊️', base: 'guardian', element: 'fire' },
  { id: 'void_kraken', emoji: '🐙🕳️', base: 'guardian', element: 'dark' },
  { id: 'stellar_basilisk', emoji: '🐍⭐', base: 'guardian', element: 'light' },
  { id: 'galaxy_behemoth', emoji: '🦖🌌', base: 'guardian', element: 'earth' },
  { id: 'photon_chimera', emoji: '💡🦁', base: 'guardian', element: 'light' },
  { id: 'neutron_wyrm', emoji: '⚛️🐉', base: 'guardian', element: 'lightning' },
  { id: 'event_horizon', emoji: '🕳️🌑', base: 'guardian', element: 'dark' },
  { id: 'celestial_archon', emoji: '👼✨', base: 'guardian', element: 'light' },
  { id: 'omega_sentinel', emoji: 'Ω🌟', base: 'guardian', element: 'light' },
  { id: 'chrono_warden', emoji: '⏳⛓️', base: 'guardian', element: 'dark' },
  { id: 'singularity', emoji: '💫🕳️', base: 'guardian', element: 'dark' },
  { id: 'aether_drake', emoji: '🌫️🐉', base: 'guardian', element: 'wind' },
  { id: 'primeval_star', emoji: '⭐🌳', base: 'guardian', element: 'light' },
  { id: 'entropy_fiend', emoji: '🌀😈', base: 'guardian', element: 'dark' },
  { id: 'genesis_golem', emoji: '🌍🗿', base: 'guardian', element: 'earth' },
  { id: 'oblivion_wraith', emoji: '🕳️👻', base: 'guardian', element: 'dark' },
  { id: 'zenith_guardian', emoji: '🔝✨', base: 'guardian', element: 'light' },
  { id: 'apocalypse', emoji: '☢️💀', base: 'guardian', element: 'dark' },
  { id: 'origin_specter', emoji: '🌌👻', base: 'guardian', element: 'dark' },
  { id: 'infinite_void', emoji: '♾️🕳️', base: 'guardian', element: 'dark' },
  { id: 'the_creator', emoji: '👁️🌟', base: 'guardian', element: 'light' },
  { id: 'the_destroyer', emoji: '💀🌌', base: 'guardian', element: 'dark' },
  { id: 'nova_prime', emoji: '🌟', base: 'guardian', element: 'light' },
];

export const BOSSES: Record<number, { id: string; emoji: string }> = {
  10: { id: 'slime_king', emoji: '👑🟣' },
  20: { id: 'heart_of_crystal', emoji: '💎' },
  30: { id: 'void_reaper', emoji: '☠️' },
  40: { id: 'inferno_drake', emoji: '🔥🐉' },
  50: { id: 'absolute_zero', emoji: '🧊' },
  75: { id: 'star_eater', emoji: '🌌' },
  100: { id: 'nova_prime', emoji: '🌟' },
};

export const DUNGEON_DROPS: Record<string, DropItem[]> = {
  slime: [
    { id: 'star_dust', emoji: '✨', rarity: 'Common', sellPrice: 15, type: 'material' },
    { id: 'slime_core', emoji: '🟣', rarity: 'Uncommon', sellPrice: 40, type: 'material' },
    { ...EQUIPMENTS.slime_boots },
    {
      id: 'gooey_jelly',
      emoji: '🟢',
      rarity: 'Common',
      sellPrice: 10,
      type: 'consumable',
      effects: [{ type: 'heal', value: 15 }],
    },
  ],
  golem: [
    { id: 'crystal_shard', emoji: '🔹', rarity: 'Uncommon', sellPrice: 55, type: 'material' },
    { id: 'stone_fragment', emoji: '🪨', rarity: 'Common', sellPrice: 20, type: 'material' },
    { ...EQUIPMENTS.iron_gauntlet },
    { id: 'golem_heart', emoji: '🗿', rarity: 'Rare', sellPrice: 120, type: 'material' },
  ],
  specter: [
    { id: 'void_essence', emoji: '🌫️', rarity: 'Rare', sellPrice: 150, type: 'material' },
    { ...EQUIPMENTS.specter_hood },
    { id: 'ectoplasm', emoji: '🟢👻', rarity: 'Uncommon', sellPrice: 60, type: 'material' },
  ],
  drake: [
    { id: 'drake_scale', emoji: '🐲', rarity: 'Rare', sellPrice: 180, type: 'material' },
    { ...EQUIPMENTS.drake_claw_dagger },
    { id: 'charred_bone', emoji: '🦴🔥', rarity: 'Uncommon', sellPrice: 70, type: 'material' },
  ],
  warden: [
    { id: 'frost_crystal', emoji: '❄️', rarity: 'Epic', sellPrice: 400, type: 'material' },
    { ...EQUIPMENTS.warden_cape },
    { id: 'ice_shard', emoji: '🧊', rarity: 'Uncommon', sellPrice: 90, type: 'material' },
  ],
  guardian: [
    { id: 'astral_fragment', emoji: '💫', rarity: 'Epic', sellPrice: 500, type: 'material' },
    { ...EQUIPMENTS.star_blade },
    { id: 'stardust', emoji: '✨', rarity: 'Rare', sellPrice: 300, type: 'material' },
  ],
};

export const BOSS_DROPS: Record<string, DropItem[]> = {
  slime: [
    { ...EQUIPMENTS.slime_crown },
    {
      id: 'royal_jelly',
      emoji: '🍯👑',
      rarity: 'Epic',
      sellPrice: 300,
      type: 'consumable',
      effects: [{ type: 'heal', value: 100 }],
    },
  ],
  golem: [
    { ...EQUIPMENTS.obsidian_plate },
    {
      id: 'heart_of_crystal',
      emoji: '💎❤️',
      rarity: 'Legendary',
      sellPrice: 600,
      type: 'material',
    },
  ],
  specter: [{ ...EQUIPMENTS.reaper_scythe }, { ...EQUIPMENTS.void_crown }],
  drake: [
    { id: 'inferno_fang', emoji: '🦷', rarity: 'Epic', sellPrice: 350, type: 'material' },
    {
      id: 'dragon_heart',
      emoji: '❤️‍🔥',
      rarity: 'Legendary',
      sellPrice: 800,
      type: 'consumable',
      effects: [{ type: 'stamina', value: 80 }],
    },
    { ...EQUIPMENTS.inferno_staff },
  ],
  warden: [
    { ...EQUIPMENTS.warden_chain },
    { id: 'absolute_shard', emoji: '🧊💎', rarity: 'Legendary', sellPrice: 950, type: 'material' },
  ],
  guardian: [
    { id: 'star_core', emoji: '🌟', rarity: 'Legendary', sellPrice: 1200, type: 'material' },
    { id: 'nebula_silk', emoji: '🌌', rarity: 'Legendary', sellPrice: 1500, type: 'material' },
    {
      id: 'quantum_orb',
      emoji: '⚛️',
      rarity: 'Legendary',
      sellPrice: 2000,
      type: 'consumable',
      effects: [{ type: 'heal', value: 250 }],
    },
    {
      id: 'nova_essence',
      emoji: '💥🌟',
      rarity: 'Mythic',
      sellPrice: 3000,
      type: 'consumable',
      effects: [
        { type: 'heal', value: 500 },
        { type: 'stamina', value: 50 },
      ],
    },
    { ...EQUIPMENTS.nova_blade },
  ],
};

export function getMonster(floor: number) {
  const boss = BOSSES[floor];
  if (boss) {
    const baseData = DUNGEON_MONSTERS.find((m) => m.id === boss.id);
    return { ...baseData, ...boss, isBoss: true, base: baseData?.base ?? 'guardian' };
  }
  const monster = DUNGEON_MONSTERS[floor - 1] ?? DUNGEON_MONSTERS[0];
  return { ...monster, isBoss: false };
}

const LORE_FLOORS = [1, 10, 11, 20, 21, 30, 31, 40, 41, 50, 51, 60, 70, 75, 76, 90, 100];

export function getFloorLore(floor: number, t: TFunction): string {
  const loreFloor =
    LORE_FLOORS.slice()
      .reverse()
      .find((f) => floor >= f) ?? 1;
  return i18nLore(`floor_${loreFloor}`, t);
}
