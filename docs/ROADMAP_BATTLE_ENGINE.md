# Nova RPG – Battle Engine Refactor Roadmap

**Branch:** `feat/equipment-skill-system` → `main` → `refactor/battle-engine`  
**Tanggal:** 25 Mei 2026  
**Tujuan:** Satu engine battle untuk Hunt, Dungeon, dan mode masa depan (PvP, Raid, Arena). Passive Rogue/Mage/Warrior sudah jalan, tapi logic duplikat.

---

## 0. Audit Saat Ini

| File | Loop | getPlayerStats | calculateDamage | Monster dmg |
|------|------|----------------|-----------------|-------------|
| `hunt.ts` | while | ✅ tiap turn | ✅ player→monster | MANUAL: `rand(dmg) - def`, warrior block 20% hardcode |
| `dungeon-battle.ts` | while | ✅ tiap turn | ✅ player→monster | MANUAL: `rand*5 + atk - def` |
| `combat.ts` | — | define | define (crit, element, def) | — |
| `skills.ts` | — | — | ✅ semua skill lewat sini | — |

**Kesimpulan:** `applyPassives()` sudah di dalam `getPlayerStats()`, jadi Shadow Dance (+15% crit >70% HP) dan Arcane Intellect (+25% critDmg >50% HP) **otomatis aktif** di Hunt & Dungeon. Yang belum: damage monster belum lewat engine.

---

## 1. Prinsip Desain

1. **Engine murni** – tidak import discord.js, tidak ada embed
2. **Stateless per turn** – panggil `getPlayerStats()` tiap ada buff
3. **Backward compatible** – Hunt & Dungeon tetap jalan selama migrasi
4. **Passive-ready** – `dodge` dan `flags` sudah disiapkan di `combat.ts`

---

## 2. Fase 0 – Setup

feat/equipment-skill-system sudah merge ke main

```bash
git checkout main
git pull
git checkout -b refactor/battle-engine
mkdir -p apps/bot/src/lib/rpg
touch apps/bot/src/lib/rpg/battle-engine.ts
```

Checklist:
- [x] Branch baru dibuat
- [x] File kosong dibuat

---

## 3. Fase 1 – Buat Battle Engine (TIDAK UBAH HUNT/DUNGEON)

**File:** `apps/bot/src/lib/rpg/battle-engine.ts`

```ts
import { getPlayerStats, calculateDamage, tickBuffs, tickSkillCooldowns, type PlayerStats } from './combat';
import { getSkill } from './skills';
import type { IUser } from '@nova/db';

export interface EnemyStats {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  element?: string;
  critRate?: number;
  critDmg?: number;
}

export interface BattleState {
  player: PlayerStats;
  enemy: EnemyStats;
  turn: number;
  log: string[];
}

export class BattleEngine {
  private user: IUser;
  state: BattleState;

  constructor(user: IUser, enemy: EnemyStats) {
    this.user = user;
    this.state = { player: null as any, enemy, turn: 0, log: [] };
  }

  async init() {
    this.state.player = await getPlayerStats(this.user);
  }

  async playerAttack(skillId?: string) {
    // pakai calculateDamage dari combat.ts
    // handle skill, cooldown, stamina
    // return { damage, isCrit, ... }
  }

  enemyAttack() {
    // GANTI manual dmg: sekarang lewat calculateDamage juga
    const enemyAsPlayer: PlayerStats = {
      hp: this.state.enemy.hp,
      maxHp: this.state.enemy.maxHp,
      atk: this.state.enemy.atk,
      def: this.state.enemy.def,
      critRate: this.state.enemy.critRate ?? 0.05,
      critDmg: this.state.enemy.critDmg ?? 1.5,
      element: (this.state.enemy.element as any) ?? 'phys',
      activeBuffs: [],
      availableSkills: [],
    };
    return calculateDamage(enemyAsPlayer, { def: this.state.player.def, element: this.state.player.element });
  }

  async endTurn() {
    tickBuffs(this.user);
    tickSkillCooldowns(this.user);
    this.state.player = await getPlayerStats(this.user);
    this.state.turn++;
  }
}
```

Checklist:
- [x] Engine bisa `init()`, `playerAttack()`, `enemyAttack()`, `endTurn()`
- [x] `npm run test` masih hijau

---

## 4. Fase 2 – Migrasi Dungeon (risiko rendah)

**File:** `dungeon-battle.ts`

Ganti:
```ts
// lama L27
let stats = await getPlayerStats(player);
// baru
const engine = new BattleEngine(player, { id: monster.id, name: monsterName, emoji: monster.emoji, hp: monsterMaxHp, maxHp: monsterMaxHp, atk: monsterAtk, def: monsterDef });
await engine.init();
```

Ganti player attack L114:
```ts
const { damage, isCrit } = await engine.playerAttack(); // bukan calculateDamage langsung
```

Ganti monster attack L228:
```ts
const { damage: monsterDamage } = engine.enemyAttack();
```

Checklist:
- [x] Dungeon lantai 1-5 test manual
- [x] Passive rogue crit 30% muncul di log
- [x] Tidak ada perubahan embed

---

## 5. Fase 3 – Migrasi Hunt

**File:** `hunt.ts`

Langkah sama, tapi tambahkan:
1. Hapus block warrior hardcode L409-414
2. Tambah di `skills.ts`:
```ts
warrior_block: {
  id: 'warrior_block',
  passive: true,
  requiredLevel: 1,
  effects: [{ type: 'buff', value: 'passive:flag:always:warrior_block' }]
}
```
3. Di `battle-engine.ts` enemyAttack():
```ts
if (this.state.player.flags?.warrior_block && Math.random() < 0.2) {
  damage = Math.floor(damage * 0.7);
}
```

Checklist:
- [ ] Hunt normal & elite jalan
- [ ] Warrior block tetap 20%
- [ ] File hunt.ts turun dari 573 ke ~380 baris

---

## 6. Fase 4 – Dodge & Flags (yang ditunda)

Karena engine sudah siap:
- `passive:dodge:hp>0.7:0.10` → cek di `playerAttack()` sebelum hit
- `passive:flag:always:poison_blades` → cek di `playerAttack()` setelah hit

---

## 7. Testing Plan

```bash
# unit
npm test combat.test.ts
npm test skills.test.ts
npm test battle-engine.test.ts # baru

# manual
/dungeon enter → lantai 3
/hunt → cek rogue crit
```

---

## 8. Rollback Plan

Jika error:
```bash
git checkout feat/equipment-skill-system -- apps/bot/src/commands/RPG/hunt.ts
git checkout feat/equipment-skill-system -- apps/bot/src/lib/rpg/dungeon/dungeon-battle.ts
```

---

## 9. File Impact Summary

- NEW: `battle-engine.ts` (~180 baris)
- MODIFY: `dungeon-battle.ts` (-80 baris)
- MODIFY: `hunt.ts` (-190 baris)
- MODIFY: `skills.ts` (+1 passive)
- UNCHANGED: `combat.ts`, `classes.ts`, `monsters.ts`

---
