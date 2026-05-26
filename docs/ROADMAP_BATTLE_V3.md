# Nova RPG — Elemental, Stamina AP, & Ultimate Roadmap

> Branch: `feat/battle-v3`
> Target: implement 3 fitur (Elemental System v2, Stamina as Action Points, Class Ultimates) tanpa breaking `/hunt` dan `/dungeon`


## 1) Buat Branch
```bash
cd ~/nova
git checkout main
git pull
git checkout -b feat/battle-v3
```

## 2) Phase 1 — Elemental System v2

### Prasyarat
- `phys` → rename ke `physical`
- Elemen saat ini di `combat.ts`: `'phys'|'fire'|'ice'|'light'|'dark'`
- Skill element refs: `skills.ts` line 10, 75, 94, 113 menggunakan `'phys'|'fire'`
- Monster belum punya element field
- Equipment `stats.element` sudah ada tapi belum diisi
- BattleEngine sudah support `element` di PlayerStats & EnemyStats

### 2.1 Update Types
**File:** `apps/bot/src/lib/rpg/combat.ts`
- Ganti:
```ts
export type Element = 'physical'|'fire'|'water'|'earth'|'wind'|'ice'|'lightning'|'light'|'dark';
```
- Update `PlayerStats.element` default: `'physical'`
- Ganti elementTable:
```ts
const elementTable: Record<Element, Partial<Record<Element, number>>> = {
  physical: {},
  fire: { ice:1.5, wind:1.5, water:0.7, earth:0.7 },
  water: { fire:1.5, earth:1.5, lightning:0.7, wind:0.7 },
  earth: { lightning:1.5, fire:1.5, wind:0.7, ice:0.7 },
  wind: { earth:1.5, water:1.5, ice:0.7, lightning:0.7 },
  ice: { wind:1.5, lightning:1.5, fire:0.7, earth:0.7 },
  lightning: { water:1.5, ice:1.5, earth:0.7, fire:0.7 },
  light: { dark:1.5 },
  dark: { light:1.5 },
};
```

### 2.2 Update Skill Types
**File:** `skills.ts` line 14
```ts
element?: Element;
```

### 2.3 Data Monster
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

### 2.4 Data Equipment
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

### 2.5 UI Battle
**File:** `hunt.ts` updateBattleEmbed
Tambah setelah title:
```ts
const weak = Object.entries(elementTable).filter(([atk, defs]) => defs[enemy.element] > 1).map(([e])=>e);
const resist = Object.entries(elementTable[enemy.element]||{}).filter(([,v])=>v<1).map(([e])=>e);
embed.addFields({ name: 'Element', value: `${enemy.emoji} ${enemy.element}`, inline:true });
```

### 2.6 Test Manual Phase 1
- `/eval await db.user.updateOne({discordId:'...'}, {$set:{'equipped.weapon':'inferno_staff'}})`
- `/hunt` vs frost_troll (ice) → damage harus ~1.5x
- `/hunt` vs lava_slime (fire) → damage ~0.7x
- Cek log: no TypeScript error

## 3) Phase 2 — Stamina sebagai Action Points

### 3.1 Ubah cost
**File:** `actions.ts` — turunkan hunt cost 15 → 5

### 3.2 Engine changes
**File:** `battle-engine.ts`
- `playerAttack()`: setelah attack, `this.user.stamina = Math.max(0, this.user.stamina - (skillId==='basic'?3:skill.staminaCost));`
- `enemyAttack()`: setelah hit, `this.user.stamina = Math.min(this.user.maxStamina, this.user.stamina + 2);`
- Tambah di `playerAttack` awal: if stamina <3 dan basic → damage *=0.5, log "Exhausted!"

### 3.3 UI
**File:** `hunt.ts` — button disabled sudah cek stamina, tambah di embed footer: `⚡${stamina}` (sudah ada)

### 3.4 Consumable
**File:** `shop.ts` tambah stamina potion (+30, 50 coins)

### 3.5 Test Manual
- Start hunt stamina 10 → 3 basic attack → stamina 1 → attack ke-4 damage 50%
- Pakai skill rage (20) → stamina habis → button disable
- Regen +2 per enemy turn terlihat

## 4) Phase 3 — Class Ultimates (Lv30)

### 4.1 Skills
**File:** `skills.ts` tambah 3 skill:
- `berserk` warrior lv30, cd 8, cost 25, buff atk +1.0 def -0.5 3 turn
- `shadow_clone` rogue lv30, cd 7, cost 20, set flag clone=2
- `meteor` mage lv30, cd 10, cost 0, hpCost 0.4*maxHp, damage 3.0*atk element fire

Update `getSkillsByClass` sudah filter by level

### 4.2 Engine flag
**File:** `battle-engine.ts` enemyAttack: cek `if(this.playerStats.flags?.shadow_clone){... dodge ...}`

### 4.3 UI
**File:** `hunt.ts` — tambah row kedua untuk ultimate (gold button), muncul jika level >=30

### 4.4 Test
- Buat test user lv30 `/eval await db.user.updateOne({discordId:'...'},{$set:{level:30}})`
- `/hunt` → tombol ultimate muncul
- Pakai meteor → HP turun 40%, damage 3x

## 5) Migration & Compatibility
- Tidak perlu DB migration (element di code only)
- Existing users dengan weapon tanpa element → default `physical`
- `calculateDamage` fallback `elementTable[attacker.element]?.[defender.element] ?? 1.0`

## 6) Testing Checklist

### Unit (manual via /eval)
1. `await getPlayerStats(user)` → element = 'physical' jika iron_sword
2. `calculateDamage({atk:100,element:'fire',...},{def:0,element:'ice'})` → ~150
3. `engine.playerAttack('basic')` → stamina -3

### Integration
- [ ] /hunt vs 5 monster berbeda element, cek multiplier
- [ ] /dungeon floor 5 (boss) dengan weapon fire vs ice boss
- [ ] Stamina habis di turn 4 → exhausted log muncul
- [ ] Ultimate warrior 3 turn buff hilang tepat waktu
- [ ] No regression di /explore, /fish (tidak pakai element)

### Performance
- getPlayerStats dipanggil tiap turn → pastikan tidak query DB tambahan (sudah lean)

## 7) Commit Plan
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


## 8) Future (optional)
- Dual-element bosses
- Elemental status effects (burn/freeze)
- Guild raid dengan elemental weakness rotation

---