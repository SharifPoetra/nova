# Nova RPG Equipment & Skill System Roadmap

Checklist buat refactor total sistem Class + Skill + Equipment. Centang kalau udah kelar.

## Kondisi Drop Sekarang
| Command | File Drop | Type Item yg Drop | Masalah |
| --- | --- | --- | --- |
| **Dungeon** | `dungeon-data.ts` L276-L408 | `material`, `equipment`, `consumable` | ✅ Equipment udah ada `stats` |
| **Hunt** | `monsters.ts` via `getScaledMonster` | Semua type, tergantung monster | ✅ Damage udah pake `getPlayerStats()` |
| **Fish** | `fishes.ts` | `material` = ikan mentah | OK, tapi gak bisa equip fishing rod |
| **Explore** | `explorations.ts` | `material`, `consumable` | OK |

## Phase 0: Persiapan & Audit - 1 hari
- [x] **0.1** Dump semua item existing (done generated dari code)
- [x] **0.2** Bikin `ITEM_REGISTRY.md`: list semua `itemId` + tentuin mau jadi `weapon/armor/material/consumable`
- [x] **0.3** Desain stat buat 6 weapon awal: `iron_sword`, `mage_staff`, `hunter_bow`, `slime_crown`, `reaper_scythe`, `obsidian_plate`

## Phase 1: Core System - 2-3 hari
- [x] **1.1** DB Schema: tambah `equipped: { weapon: string|null, armor: string|null, accessory: string|null }` di `User.ts`
- [x] **1.2** DB Schema: tambah `stats?: EquipmentStat` di `Item.ts`
- [x] **1.3** Buat `/lib/rpg/equipment.ts`: type `EquipmentStat`, `getItemData()`, `validateEquip()`
- [x] **1.4** Buat `/lib/rpg/skills.ts`: pindahin 3 skill sekarang + interface `Skill`
- [x] **1.5** Buat `/lib/rpg/combat.ts`: function `getPlayerStats(player)` yg return `totalAtk`, `critRate`, `skills[]`
- [x] **1.6** Update `classes.ts`: tambah `skillId`, `passiveId`
- [x] **1.7** Unit test: `getPlayerStats()` return bener kalau equip `iron_sword {atk:12}`

## Phase 2: Integrasi Dungeon - 2 hari
- [x] **2.1** Refactor `dungeon-battle.ts`: hapus semua `if player.class ===`, ganti pake `getPlayerStats()`
- [x] **2.2** Refactor skill button: `const skill = SKILLS[stats.skills[0]]` + `skill.use(ctx)`
- [x] **2.3** Drop per monster: pindahin logic drop ke setelah `battleResult.victory`
- [x] **2.4** Update `BOSS_DROPS`: kasih `stats: { atk: 25, critRate: 0.1 }` ke equipment
- [x] **2.6** Commit: `feat(dungeon): integrate equipment stats and per-monster drops`

## Phase 3: Command Inventory & Equip - 1 hari
- [x] **3.1** `/inventory` tambah select menu: `equip`, `unequip`, dan tampilin `stats`
- [x] **2.5** Test: equip `iron_sword`, damage harus naik
- [x] **3.2** `/inventory equip weapon:iron_sword` → validasi `classLock`, `type === 'weapon'`
- [ ] **3.3** `/profile` tampilin equipment + total atk
- [x] **3.4** Commit: `feat(inventory): add equip system`

## Phase 4: Hunt, Fish, Explore - 2 hari
- [x] **4.1** `hunt.ts`: ganti dmg calc pake `getPlayerStats()`. Hapus hardcoded crit
- [x] **4.1b** `hunt.ts`: fix HP calc pake `stats.maxHp` bukan `user.maxHp`
- [x] **4.1c** `combat.ts`: fix infinite loop di `applyPassives`, fix `availableSkills.push` undefined
- [ ] **4.2** `monsters.ts`: tambah drop `type: 'equipment'` buat monster rare + kasih `stats` dan `slot`
- [ ] **4.3** `fish.ts` & `explorations.ts`: siapin buat fishing rod nanti
- [ ] **4.4** Test: `/hunt` pake `reaper_scythe` harus crit lebih sering
- [ ] **4.5** Commit: `refactor(rpg): use unified combat stats in all commands`

## Phase 5: Content & Balance - Ongoing
- [ ] **5.1** Isi 20 weapon/armor di DB: tier Common→Legendary
- [ ] **5.2** Bikin 6 skill baru: 2 per class, unlock level 10, 25
- [ ] **5.3** `simdroprate.ts` update: simulasi DPS pake equipment
- [ ] **5.4** Balancing sheet: itung `avg damage per turn` tiap combo
- [ ] **5.5** Commit: `content(rpg): add 20 equips and 6 skills`

## Phase 6: Polish - 1 hari
- [ ] **6.1** Locale: tambah `commands/inventory:equip_success`, `skills.json`
- [ ] **6.2** Help command: `/help equipment` jelasin stat
- [ ] **6.3** Migrate item existing: script kasih `stats` ke item lama
- [ ] **6.4** Commit: `chore: migrate old items to new equipment system`

## Bug Fixes - 2026-05-17
- [x] **B1** Fix `maxHp` ga ngitung equipment: ganti `user.maxHp` → `getPlayerStats().maxHp` di hunt, cook, shop, invUse
- [x] **B2** Fix infinite loop: `applyPassives` hapus `async` + jangan panggil `getPlayerStats` lagi
- [x] **B3** Fix `availableSkills.push undefined`: guard array init di `applyPassives` + `getPlayerStats`
- [x] **B4** Fix variable collision `uHp` vs `stats.hp` di `hunt.ts`

## Aturan Main
1. Jangan sentuh command sebelum Phase 1 kelar
2. Semua stat WAJIB lewat `getPlayerStats()`. Kalau ada `player.attack` di command = reject
3. Item baru default `stats: undefined`. Weapon harus explicit kasih stats
4. Drop rate equipment: Boss 100%, Elite 15%, Normal 3%
5. **RULE BARU**: Jangan pernah pake `user.maxHp` di command. Selalu `const stats = await getPlayerStats(user)` terus pake `stats.maxHp`
