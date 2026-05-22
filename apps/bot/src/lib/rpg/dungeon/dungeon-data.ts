import type { IEquipmentStat, EquipmentSlot } from '@nova/db';
import type { TFunction } from 'i18next';
import type { Rarity } from '../../utils';
import { EQUIPMENTS } from '../equipments';
import { i18nLore } from '../../i18n/display';

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

export const DUNGEON_MONSTERS = [
  { id: 'green_slime', emoji: '🟢', base: 'slime' },
  { id: 'blue_slime', emoji: '🔵', base: 'slime' },
  { id: 'red_slime', emoji: '🔴', base: 'slime' },
  { id: 'gold_slime', emoji: '🟡', base: 'slime' },
  { id: 'shadow_slime', emoji: '⚫', base: 'slime' },
  { id: 'poison_slime', emoji: '🟩', base: 'slime' },
  { id: 'electric_slime', emoji: '🟡⚡', base: 'slime' },
  { id: 'lava_slime', emoji: '🔴🌋', base: 'slime' },
  { id: 'ice_slime', emoji: '🔵❄️', base: 'slime' },
  { id: 'slime_king', emoji: '👑🟣', base: 'slime' },
  { id: 'earth_golem', emoji: '🪨', base: 'golem' },
  { id: 'iron_golem', emoji: '⚙️', base: 'golem' },
  { id: 'crystal_golem', emoji: '🗿', base: 'golem' },
  { id: 'lava_golem', emoji: '🌋', base: 'golem' },
  { id: 'ice_golem', emoji: '🧊', base: 'golem' },
  { id: 'sand_golem', emoji: '🏜️', base: 'golem' },
  { id: 'obsidian_golem', emoji: '⬛', base: 'golem' },
  { id: 'gold_golem', emoji: '🟨', base: 'golem' },
  { id: 'void_golem', emoji: '🕳️', base: 'golem' },
  { id: 'heart_of_crystal', emoji: '💎', base: 'golem' },
  { id: 'wild_ghost', emoji: '👻', base: 'specter' },
  { id: 'wandering_spirit', emoji: '💀', base: 'specter' },
  { id: 'void_specter', emoji: '🌫️', base: 'specter' },
  { id: 'night_wraith', emoji: '🌙', base: 'specter' },
  { id: 'screaming_banshee', emoji: '😱', base: 'specter' },
  { id: 'shadow_phantom', emoji: '👤', base: 'specter' },
  { id: 'poltergeist', emoji: '🌀', base: 'specter' },
  { id: 'revenant', emoji: '🧟', base: 'specter' },
  { id: 'shadow_fiend', emoji: '😈', base: 'specter' },
  { id: 'void_reaper', emoji: '☠️', base: 'specter' },
  { id: 'young_drake', emoji: '🦎', base: 'drake' },
  { id: 'fire_drake', emoji: '🔥', base: 'drake' },
  { id: 'lightning_drake', emoji: '⚡', base: 'drake' },
  { id: 'ice_drake', emoji: '❄️🐉', base: 'drake' },
  { id: 'ancient_wyvern', emoji: '🐲', base: 'drake' },
  { id: 'poison_drake', emoji: '☠️🐉', base: 'drake' },
  { id: 'earth_drake', emoji: '🪨🐉', base: 'drake' },
  { id: 'wind_drake', emoji: '🌪️🐉', base: 'drake' },
  { id: 'shadow_drake', emoji: '🌑🐉', base: 'drake' },
  { id: 'inferno_drake', emoji: '🔥🐉', base: 'drake' },
  { id: 'prison_warden', emoji: '⛓️', base: 'warden' },
  { id: 'frost_warden', emoji: '❄️', base: 'warden' },
  { id: 'flame_warden', emoji: '🔥', base: 'warden' },
  { id: 'storm_warden', emoji: '🌩️', base: 'warden' },
  { id: 'void_warden', emoji: '🕳️', base: 'warden' },
  { id: 'earth_warden', emoji: '🌍', base: 'warden' },
  { id: 'light_warden', emoji: '💡', base: 'warden' },
  { id: 'blood_warden', emoji: '🩸', base: 'warden' },
  { id: 'chaos_warden', emoji: '🌀', base: 'warden' },
  { id: 'absolute_zero', emoji: '🧊', base: 'warden' },
  { id: 'silver_guardian', emoji: '🥈', base: 'guardian' },
  { id: 'gold_guardian', emoji: '🥇', base: 'guardian' },
  { id: 'astral_guardian', emoji: '✨', base: 'guardian' },
  { id: 'celestial_knight', emoji: '⚔️✨', base: 'guardian' },
  { id: 'star_sentinel', emoji: '🌟', base: 'guardian' },
  { id: 'lunar_guardian', emoji: '🌙✨', base: 'guardian' },
  { id: 'solar_guardian', emoji: '☀️✨', base: 'guardian' },
  { id: 'nebula_guardian', emoji: '🌌', base: 'guardian' },
  { id: 'quantum_guardian', emoji: '⚛️', base: 'guardian' },
  { id: 'titan_starforge', emoji: '🔨⭐', base: 'guardian' },
  { id: 'void_walker', emoji: '🚶🕳️', base: 'guardian' },
  { id: 'cosmic_horror', emoji: '👁️🌌', base: 'guardian' },
  { id: 'galactic_serpent', emoji: '🐍🌌', base: 'guardian' },
  { id: 'plasma_phantom', emoji: '⚡👻', base: 'guardian' },
  { id: 'meteor_golem', emoji: '☄️🗿', base: 'guardian' },
  { id: 'black_hole_fiend', emoji: '🕳️😈', base: 'guardian' },
  { id: 'supernova_drake', emoji: '💥🐉', base: 'guardian' },
  { id: 'comet_wraith', emoji: '☄️👻', base: 'guardian' },
  { id: 'pulsar_knight', emoji: '💫⚔️', base: 'guardian' },
  { id: 'dark_matter_beast', emoji: '⚫👹', base: 'guardian' },
  { id: 'eclipse_specter', emoji: '🌑👻', base: 'guardian' },
  { id: 'gravity_warden', emoji: '🌀⛓️', base: 'guardian' },
  { id: 'rift_stalker', emoji: '🪓🕳️', base: 'guardian' },
  { id: 'quasar_fiend', emoji: '💥😈', base: 'guardian' },
  { id: 'star_eater', emoji: '🌌', base: 'guardian' },
  { id: 'nebula_hydra', emoji: '🐍🌌', base: 'guardian' },
  { id: 'cosmic_leviathan', emoji: '🐋🌌', base: 'guardian' },
  { id: 'astral_phoenix', emoji: '🔥🕊️', base: 'guardian' },
  { id: 'void_kraken', emoji: '🐙🕳️', base: 'guardian' },
  { id: 'stellar_basilisk', emoji: '🐍⭐', base: 'guardian' },
  { id: 'galaxy_behemoth', emoji: '🦖🌌', base: 'guardian' },
  { id: 'photon_chimera', emoji: '💡🦁', base: 'guardian' },
  { id: 'neutron_wyrm', emoji: '⚛️🐉', base: 'guardian' },
  { id: 'event_horizon', emoji: '🕳️🌑', base: 'guardian' },
  { id: 'celestial_archon', emoji: '👼✨', base: 'guardian' },
  { id: 'omega_sentinel', emoji: 'Ω🌟', base: 'guardian' },
  { id: 'chrono_warden', emoji: '⏳⛓️', base: 'guardian' },
  { id: 'singularity', emoji: '💫🕳️', base: 'guardian' },
  { id: 'aether_drake', emoji: '🌫️🐉', base: 'guardian' },
  { id: 'primeval_star', emoji: '⭐🌳', base: 'guardian' },
  { id: 'entropy_fiend', emoji: '🌀😈', base: 'guardian' },
  { id: 'genesis_golem', emoji: '🌍🗿', base: 'guardian' },
  { id: 'oblivion_wraith', emoji: '🕳️👻', base: 'guardian' },
  { id: 'zenith_guardian', emoji: '🔝✨', base: 'guardian' },
  { id: 'apocalypse', emoji: '☢️💀', base: 'guardian' },
  { id: 'origin_specter', emoji: '🌌👻', base: 'guardian' },
  { id: 'infinite_void', emoji: '♾️🕳️', base: 'guardian' },
  { id: 'the_creator', emoji: '👁️🌟', base: 'guardian' },
  { id: 'the_destroyer', emoji: '💀🌌', base: 'guardian' },
  { id: 'nova_prime', emoji: '🌟', base: 'guardian' },
] as const;

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
    return { ...boss, isBoss: true, base: baseData?.base ?? 'guardian' };
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
