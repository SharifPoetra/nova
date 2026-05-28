# Nova RPG — Elemental & Stamina AP Roadmap

> Branch: `feat/battle-v3` (sudah dibuat)
> Target: implement 2 fitur utama (Elemental System v2, Stamina as Action Points) tanpa breaking `/hunt` dan `/dungeon`
> Note: Class Ultimates di-drop untuk v3, masuk backlog

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
- Ganti hardcode `element: 'physical'` jadi `element: monster.element ?? 'physical'` di constructor `BattleEngine`
- Update call `buildBattleEmbed` di dalam fungsi `updateBattle` — tambah param baru: `monsterElement: Element`

### 1.8 Update dungeon-ui
- Tambah param ke interface `buildBattleEmbed`: `monsterElement: Element`
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
| `/hunt` vs frost_troll (ice) + inferno_staff (fire) | damage ~1.5x, Element field tampil |
| `/hunt` vs lava_slime (fire) + inferno_staff (fire) | damage ~0.7x |
| `/hunt` default weapon (physical) | damage normal, element tampil |

**Dungeon tests:**

| Test | Expected |
|---|---|
| `/dungeon` floor 2 (blue_slime, water) + fire weapon | damage ~1.5x |
| `/dungeon` floor 3 (red_slime, fire) + water weapon | damage ~1.5x |
| `/dungeon` floor 10 boss (slime_king) | element `🌑 dark` muncul |
| `/dungeon` floor 40 boss (inferno_drake) | element `🔥 fire` muncul |
| TypeScript build | no errors |

> Catatan: duplicate query Item di `getPlayerStats`. Biarkan untuk Phase 1.

---

## Phase 2 — Stamina sebagai Action Points

### 2.1 Ubah cost
**File:** `actions.ts` — hunt cost 10 → 5

### 2.2 Engine changes
**File:** `battle-engine.ts`
- `playerAttack()`: di awal (setelah `await this.refreshStats()`):
```ts
if (this.turn > 0) {
  const before = this.user.stamina;
  this.user.stamina = Math.min(this.user.maxStamina, this.user.stamina + 2);
  const gained = this.user.stamina - before;
  if (gained > 0) this.logPush(`⚡ +${gained} Stamina (${this.user.stamina}/${this.user.maxStamina})`);
}
```
→ Regen +2 stamina setiap turn player

- `playerAttack()`: basic attack:
```ts
const isExhausted = this.user.stamina < 3;
const dmgMult = isExhausted ? 0.5 : 1.0;
const result = calculateDamage(this.playerStats, { def: this.enemy.def, element: this.enemy.element }, dmgMult);
// ...
this.user.stamina = Math.max(0, this.user.stamina - 3);
if (isExhausted) extra += ` 😮‍💨 Exhausted`;
```
→ Cost 3, exhausted = 50% damage

- `playerAttack()`: skill tetap pakai `skill.staminaCost`

### 2.3 UI
**File:** `hunt.ts` — `setDisabled(!canUse.ok)` sudah benar

### 2.4 Consumable
**File:** `shop.ts` — stamina potion price 150 → 50

### 2.5 Test Manual
- Start hunt stamina 10 → 3x basic → stamina 1 → attack ke-4 damage 50%
- Skill disable saat stamina kurang
- Regen muncul tiap turn

---

## Phase 3 — Polish & Balance (ganti Ultimates)

> Ultimates di-drop. Fokus stabilkan 2 sistem inti dulu.

### 3.1 Balance tuning
- Cek apakah hunt cost 5 terlalu spam — monitor stamina potion usage
- Cek apakah regen +2 terlalu cepat di dungeon panjang
- Adjust elementTable jika ada elemen terlalu OP (light/dark 1.5x)

### 3.2 Code cleanup
**File:** `combat.ts` / `getPlayerStats`
- Hapus duplicate `Item.find()` — gabung dengan `sumEquipmentStats`
- Cache equipment stats per battle

### 3.3 Data completion
- Isi `stats.element` untuk armor/accessory yang belum
- Review 100 dungeon monsters — pastikan tidak ada `element` undefined

### 3.4 QA
- `/hunt` 20x dengan 3 class berbeda
- `/dungeon` F1-F20 full run
- Pastikan `/explore`, `/fish`, `/daily` tidak terpengaruh stamina

---

## Migration & Compatibility
- Tidak perlu DB migration
- Existing weapon tanpa element → default `physical`
- `calculateDamage` fallback ke 1.0

## Checklist Tracking

### Phase 1 — Elemental
- [x] Update `combat.ts` Element type + elementTable
- [x] Update `skills.ts` element?: Element
- [x] Tambah field element di `monsters.ts`
- [x] Isi element 18 monster hunt
- [x] Isi element 15+ weapon
- [x] Update UI `hunt.ts`
- [x] Isi element 100 dungeon monsters
- [x] Update `dungeon-battle.ts` & `dungeon-ui.ts`
- [x] Test fire vs ice, water vs fire
- [x] Commit: `feat(elements): add 9-element system`

### Phase 2 — Stamina AP
- [x] Ubah ACTION_COST.hunt 10→5
- [x] Implement stamina -3 basic
- [x] Implement stamina +2 regen di awal turn
- [x] Tambah exhausted 50% + log
- [x] Update stamina potion price 150→50
- [x] Test 3x basic → exhausted
- [x] Test skill disable
- [x] Commit: `feat(stamina): action points system`

### Phase 3 — Polish & Balance
- [x] Monitor hunt spam rate (target 8-12 hunt per jam) → hasil: 10.3/jam
- [x] Tune regen jika dungeon F30+ terlalu mudah → regen +2 pas, nggak diubah
- [x] Hapus duplicate Item query di getPlayerStats
- [ ] Lengkapi element untuk semua equipment → backlog
- [x] Final QA hunt/dungeon 50x
- [x] TypeScript build sukses
- [x] Merge feat/battle-v3 → main

### 3.1 Balance tuning
- [x] Hunt cost 5 → spam rate 10.3/jam (target tercapai)
- [x] Boss HP smoothing F50+ (3.5→3.35/3.25/3.15) — F75 win rate Warrior 17%→45%
- [x] Mage buff: fireball 1.5→1.7, stamina 18→16, arcane intellect +0.25→+0.35
- [x] Rogue nerf: backstab CD 4→5
- [x] Warrior buff: berserker 1%→1.5% per 10% HP loss

## Commit Plan
```bash
git add apps/bot/src/lib/rpg/actions.ts apps/bot/src/lib/rpg/battle-engine.ts
git commit -m "feat(stamina): action points -3 basic, +2 regen, exhausted"

git add apps/bot/src/commands/
git commit -m "feat(stamina): update shop and hunt UI"

git add docs/ROADMAP_BATTLE_V3.md
git commit -m "docs(roadmap): drop ultimates, add Phase 3 polish"

git push origin feat/battle-v3
```

## Backlog (Future)
- Class Ultimates Lv30 (berserk, shadow_clone, meteor) — ditunda sampai balance stabil
- Dual-element bosses
- Elemental status effects (burn/freeze)
- Guild raid elemental rotation
