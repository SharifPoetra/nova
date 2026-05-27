# Nova RPG — Elemental, Stamina AP, & Ultimate Roadmap

> Branch: `feat/battle-v3` (sudah dibuat)
> Target: implement 3 fitur (Elemental System v2, Stamina as Action Points, Class Ultimates) tanpa breaking `/hunt` dan `/dungeon`

## Phase 1 — Elemental System v2

### Prasyarat
- `phys` → rename ke `physical`
- Elemen saat ini di `combat.ts`: `'phys'|'fire'|'ice'|'light'|'dark'`
- Skill element refs: `skills.ts` line 10, 75, 94, 113 menggunakan `'phys'|'fire'`
- Monster belum punya element field
- Equipment `stats.element` sudah ada tapi belum diisi
- BattleEngine sudah support `element` di PlayerStats & EnemyStats

### 1.1 Update Types
**File:** `combat.ts`
- Ganti:
```ts
export type Element = 'physical'|'fire'|'water'|'earth'|'wind'|'ice'|'lightning'|'light'|'dark';
```
- Update `PlayerStats.element` default: `'physical'`
- Ganti elementTable:
```ts
const elementTable: Record<Element, Partial<Record<Element, number>>> = {
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
```

### 1.2 Update Skill Types
**File:** `skills.ts` line 14
```ts
element?: Element;
```

### 1.3 Data Monster
**File:** `monsters.ts` — tambah field `element: Element` di BaseMonster
```ts
export interface BaseMonster { ... element: Element; ... }
```
Isi 18 monster:
- wild_boar → earth
- goblin_scout → physical
- swamp_lizard → water
- forest_wolf → wind
- cave_bear → earth
- skeleton_warrior → dark
- venom_spider → earth
- harpy → wind
- orc_berserker → fire
- shadow_panther → dark
- lava_slime → fire
- frost_troll → ice
- sand_worm → earth
- dark_knight → dark
- thunder_eagle → lightning
- crystal_golem → light
- hydra → water
- phoenix → fire

### 1.4 Data Equipment
**File:** `equipments.ts` — isi `stats.element` untuk weapon:
- iron_sword, rusted_sword, war_axe, goblin_dagger → physical
- ice_club, frost_cape → ice
- mage_staff → physical (base), inferno_staff → fire, crystal_staff → light
- thunder_bow → lightning
- lava_boots → fire
- harpy_bow → wind
- drake_claw_dagger, hydra_venom_dagger → water
- reaper_scythe, cursed_blade → dark
- star_blade, nova_blade → light

### 1.5 UI Battle
**File:** `hunt.ts` updateBattleEmbed tampilkan element

### 1.6 Data Monster (dungeon)
**File:** `dungeon-data.ts`
- Fix `getMonster()` untuk boss

#### 1.6.1 Isi element semua monster

**slime (10 monster):**

| id | element |
|---|---|
| green_slime | earth |
| blue_slime | water |
| red_slime | fire |
| gold_slime | light |
| shadow_slime | dark |
| poison_slime | earth |
| electric_slime | lightning |
| lava_slime | fire |
| ice_slime | ice |
| slime_king *(boss F10)* | dark |

**golem (10 monster):**

| id | element |
|---|---|
| earth_golem | earth |
| iron_golem | physical |
| crystal_golem | light |
| lava_golem | fire |
| ice_golem | ice |
| sand_golem | earth |
| obsidian_golem | dark |
| gold_golem | light |
| void_golem | dark |
| heart_of_crystal *(boss F20)* | light |

**specter (10 monster):**

| id | element |
|---|---|
| wild_ghost | dark |
| wandering_spirit | dark |
| void_specter | dark |
| night_wraith | dark |
| screaming_banshee | dark |
| shadow_phantom | dark |
| poltergeist | wind |
| revenant | dark |
| shadow_fiend | dark |
| void_reaper *(boss F30)* | dark |

**drake (10 monster):**

| id | element |
|---|---|
| young_drake | physical |
| fire_drake | fire |
| lightning_drake | lightning |
| ice_drake | ice |
| ancient_wyvern | wind |
| poison_drake | earth |
| earth_drake | earth |
| wind_drake | wind |
| shadow_drake | dark |
| inferno_drake *(boss F40)* | fire |

**warden (10 monster):**

| id | element |
|---|---|
| prison_warden | physical |
| frost_warden | ice |
| flame_warden | fire |
| storm_warden | lightning |
| void_warden | dark |
| earth_warden | earth |
| light_warden | light |
| blood_warden | dark |
| chaos_warden | dark |
| absolute_zero *(boss F50)* | ice |

**guardian (50+ monster — endgame):**

| id | element |
|---|---|
| silver_guardian | light |
| gold_guardian | light |
| astral_guardian | light |
| celestial_knight | light |
| star_sentinel | light |
| lunar_guardian | dark |
| solar_guardian | light |
| nebula_guardian | dark |
| quantum_guardian | physical |
| titan_starforge | physical |
| void_walker | dark |
| cosmic_horror | dark |
| galactic_serpent | dark |
| plasma_phantom | lightning |
| meteor_golem | fire |
| black_hole_fiend | dark |
| supernova_drake | fire |
| comet_wraith | ice |
| pulsar_knight | lightning |
| dark_matter_beast | dark |
| eclipse_specter | dark |
| gravity_warden | dark |
| rift_stalker | dark |
| quasar_fiend | light |
| star_eater *(boss F75)* | dark |
| nebula_hydra | water |
| cosmic_leviathan | water |
| astral_phoenix | fire |
| void_kraken | dark |
| stellar_basilisk | light |
| galaxy_behemoth | earth |
| photon_chimera | light |
| neutron_wyrm | lightning |
| event_horizon | dark |
| celestial_archon | light |
| omega_sentinel | light |
| chrono_warden | dark |
| singularity | dark |
| aether_drake | wind |
| primeval_star | light |
| entropy_fiend | dark |
| genesis_golem | earth |
| oblivion_wraith | dark |
| zenith_guardian | light |
| apocalypse | dark |
| origin_specter | dark |
| infinite_void | dark |
| the_creator | light |
| the_destroyer | dark |
| nova_prime *(boss F100)* | light |

---

### 1.7 Update dungeon-battle
**File:** `dungeon-battle.ts`
- Ganti hardcode `element: 'physical'` jadi `element: monster.element ?? 'physical` di constructor `BattleEngine`
- Update call `buildBattleEmbed` di dalam fungsi `updateBattle` — tambah param baru: `monsterElement: Element`

### 1.8 Update dungeon-ui
- Tambah dua param baru ke interface `buildBattleEmbed`: `monsterElement: Element`
- Element ditampilkan di bawah HP bar monster

---

### 1.9 Test Manual Phase 1
```bash
# Setup test weapon fire
/eval await db.user.updateOne({discordId:'YOUR_ID'}, {$set:{'equipped.weapon':'inferno_staff'}})
```

**Hunt tests:**

| Test | Expected |
|---|---|
| `/hunt` vs frost_troll (ice) + inferno_staff (fire) | damage ~1.5x, Element field tampil `🔥 FIRE → ❄️💨` |
| `/hunt` vs lava_slime (fire) + inferno_staff (fire) | damage ~0.7x |
| `/hunt` default weapon (physical) | damage normal, element tampil |

**Dungeon tests:**

| Test | Expected |
|---|---|
| `/dungeon` floor 2 (blue_slime, water) + fire weapon | damage ~1.5x |
| `/dungeon` floor 3 (red_slime, fire) + water weapon | damage ~1.5x |
| `/dungeon` floor 4 (gold_slime, light) + physical weapon | damage normal (physical → light: 0.9) |
| `/dungeon` floor 10 boss (slime_king) | element `🌑 dark` muncul di bawah HP bar |
| `/dungeon` floor 40 boss (inferno_drake) | element `🔥 fire` muncul, boss indicator tetap tampil |
| `/dungeon` floor 50 boss (absolute_zero) | element `❄️ ice` muncul |
| TypeScript build | no errors |

> Catatan: duplicate query Item di `getPlayerStats` (sekali di `sumEquipmentStats`, sekali lagi buat `grantsSkill`). Nanti bisa di-optimize, tapi untuk Phase 1 biarin dulu biar gak break.

---

## Phase 2 — Stamina sebagai Action Points

### 2.1 Ubah cost
**File:** `actions.ts` — turunkan hunt cost 15 → 5

### 2.2 Engine changes
**File:** `battle-engine.ts`
- `playerAttack()`: setelah attack, `this.user.stamina = Math.max(0, this.user.stamina - (skillId==='basic'?3:skill.staminaCost));`
- `enemyAttack()`: setelah hit, `this.user.stamina = Math.min(this.user.maxStamina, this.user.stamina + 2);`
- Tambah di `playerAttack` awal: if stamina <3 dan basic → damage *=0.5, log "Exhausted!"

### 2.3 UI
**File:** `hunt.ts` — button disabled sudah cek stamina, tambah di embed footer: `⚡${stamina}` (sudah ada)

### 2.4 Consumable
**File:** `shop.ts` tambah stamina potion (+30, 50 coins)

### 2.5 Test Manual
- Start hunt stamina 10 → 3 basic attack → stamina 1 → attack ke-4 damage 50%
- Pakai skill rage (20) → stamina habis → button disable
- Regen +2 per enemy turn terlihat

## Phase 3 — Class Ultimates (Lv30)

### 3.1 Skills
**File:** `skills.ts` tambah 3 skill:
- `berserk` warrior lv30, cd 8, cost 25, buff atk +1.0 def -0.5 3 turn
- `shadow_clone` rogue lv30, cd 7, cost 20, set flag clone=2
- `meteor` mage lv30, cd 10, cost 0, hpCost 0.4*maxHp, damage 3.0*atk element fire

Update `getSkillsByClass` sudah filter by level

### 3.2 Engine flag
**File:** `battle-engine.ts` enemyAttack: cek `if(this.playerStats.flags?.shadow_clone){... dodge ...}`

### 3.3 UI
**File:** `hunt.ts` — tambah row kedua untuk ultimate (gold button), muncul jika level >=30

### 3.4 Test
- Buat test user lv30 `/eval await db.user.updateOne({discordId:'...'},{$set:{level:30}})`
- `/hunt` → tombol ultimate muncul
- Pakai meteor → HP turun 40%, damage 3x

## Migration & Compatibility
- Tidak perlu DB migration (element di code only)
- Existing users dengan weapon tanpa element → default `physical`
- `calculateDamage` fallback `elementTable[attacker.element]?.[defender.element] ?? 1.0`

## Checklist Tracking

### Phase 1 — Elemental
- [x] Update `combat.ts` Element type + elementTable (Element di export dari @nova/db, done.)
- [x] Update `skills.ts` element?: Element
- [x] Tambah field element di `monsters.ts` interface
- [x] Isi element 18 monster
- [x] Isi element 15+ weapon di `equipments.ts`
- [x] Update UI `hunt.ts` tampilkan element
- [x] Test fire vs ice (1.5x)
- [x] Test physical default
- [x] Commit: `feat(elements): add 9-element system`
- [x] Hapus `as const` di `DUNGEON_MONSTERS`, ganti explicit type annotation + tambah field `element`
- [x] Isi element semua ~100 monster dungeon (slime×10, golem×10, specter×10, drake×10, warden×10, guardian×50)
- [x] Fix `getMonster()` — boss spread `baseData` dulu biar `element` ikut terbawa
- [x] Update `dungeon-battle.ts` — tambah `ELEMENT_EMOJI` import, ganti hardcode `element: 'physical'` → `monster.element ?? 'physical'`
- [x] Update call `buildBattleEmbed` di `dungeon-battle.ts` — pass `monsterElement`
- [x] Update `dungeon-ui.ts` — tambah param `monsterElement`, tampilkan di bawah HP bar monster
- [x] Test `/dungeon` floor 2 blue_slime (water) + fire weapon → 1.5x
- [x] Test `/dungeon` floor 3 red_slime (fire) + water weapon → 1.5x
- [x] Test element muncul di bawah HP bar dungeon (non-boss & boss)
- [x] Commit: `feat(elements): assign elements to dungeon monsters + dungeon UI`

### Phase 2 — Stamina AP
- [ ] Ubah ACTION_COST.hunt 15→5 di `actions.ts`
- [ ] Implement stamina -3 basic di `battle-engine.ts`
- [ ] Implement stamina +2 regen per enemy turn
- [ ] Tambah exhausted damage 50% log
- [ ] Tambah stamina potion di `shop.ts`
- [ ] Test 3x attack → exhausted
- [ ] Test skill disable saat stamina kurang
- [ ] Commit: `feat(stamina): action points`

### Phase 3 — Ultimates
- [ ] Tambah skill berserk di `skills.ts`
- [ ] Tambah skill shadow_clone
- [ ] Tambah skill meteor (hp cost)
- [ ] Implement flag shadow_clone di engine
- [ ] Tambah UI gold button di `hunt.ts`
- [ ] Test warrior lv30 berserk
- [ ] Test rogue clone dodge 2x
- [ ] Test mage meteor HP -40%
- [ ] Commit: `feat(ultimates): lv30 skills`

### Final QA
- [ ] /hunt 10x tanpa error
- [ ] /dungeon floor 1-10 lancar
- [ ] /explore, /fish tidak terpengaruh
- [ ] TypeScript build sukses
- [ ] Push origin feat/battle-v3
- [ ] Merge ke main setelah test

## Commit Plan
```bash
git add apps/bot/src/lib/rpg/combat.ts
git commit -m "feat(elements): add 9-element system keep physical"

git add apps/bot/src/lib/rpg/monsters.ts apps/bot/src/lib/rpg/equipments.ts
git commit -m "feat(elements): assign elements to monsters and weapons"

git add apps/bot/src/lib/rpg/battle-engine.ts apps/bot/src/commands/RPG/hunt.ts
git commit -m "feat(stamina): implement action points in battle"

git add apps/bot/src/lib/rpg/skills.ts
git commit -m "feat(ultimates): add lv30 class ultimates"

git push origin feat/battle-v3
```

## Future (optional)
- Dual-element bosses
- Elemental status effects (burn/freeze)
- Guild raid dengan elemental weakness rotation
