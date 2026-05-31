// apps/bot/tests/unit/rpg/dungeon.test.ts
import { describe, it, expect } from 'vitest';
import {
  getMonster,
  getFloorLore,
  BOSSES,
  DUNGEON_MONSTERS,
  DUNGEON_DROPS,
  BOSS_DROPS,
} from '../../../src/lib/rpg/dungeon/dungeon-data';
import { createRunState, getCheckpoint } from '../../../src/lib/rpg/dungeon/dungeon-state';
import { rollEvent, getZone, DUNGEON_EVENTS } from '../../../src/lib/rpg/dungeon/dungeon-events';

describe('dungeon-data', () => {
  it('boss floors return isBoss=true', () => {
    expect(getMonster(10).isBoss).toBe(true);
    expect(getMonster(10).name).toBe('Raja Slime');
    expect(getMonster(20).name).toBe('Heart of Crystal');
    expect(getMonster(30).name).toBe('Void Reaper');
    expect(getMonster(100).name).toBe('Nova Prime');
  });

  it('non-boss floors return normal monster', () => {
    const m1 = getMonster(1);
    expect(m1.isBoss).toBe(false);
    expect(m1.base).toBe('slime');
  });

  it('floor lore uses last defined key', () => {
    expect(getFloorLore(1)).toContain('lendir');
    expect(getFloorLore(10)).toContain('Tahta lendir');
    expect(getFloorLore(11)).toContain('mengkristal');
    expect(getFloorLore(15)).toBe(getFloorLore(11));
    expect(getFloorLore(100)).toContain('Nova Prime');
  });
});

describe('dungeon-state', () => {
  it('createRunState: boss = 4 rooms, normal = 3-4', () => {
    const bossState = createRunState(10);
    expect(bossState.rooms).toBe(4);

    const normal = createRunState(5);
    expect([3, 4]).toContain(normal.rooms);
    expect(normal.current).toBe(0);
    expect(normal.hasBattle).toBe(false);
  });

  it('getCheckpoint every 25 floors', () => {
    expect(getCheckpoint(1)).toBe(1);
    expect(getCheckpoint(9)).toBe(1);
    expect(getCheckpoint(10)).toBe(1);
    expect(getCheckpoint(25)).toBe(1);
    expect(getCheckpoint(26)).toBe(25);
    expect(getCheckpoint(27)).toBe(25);
    expect(getCheckpoint(50)).toBe(25);
    expect(getCheckpoint(51)).toBe(50);
    expect(getCheckpoint(76)).toBe(75);
    expect(getCheckpoint(100)).toBe(75);
  });
});

describe('dungeon-zones', () => {
  it('getZone maps correctly', () => {
    expect(getZone(1)).toBe('ruins');
    expect(getZone(20)).toBe('ruins');
    expect(getZone(21)).toBe('mines');
    expect(getZone(40)).toBe('mines');
    expect(getZone(41)).toBe('library');
    expect(getZone(60)).toBe('library');
    expect(getZone(61)).toBe('temple');
    expect(getZone(80)).toBe('temple');
    expect(getZone(81)).toBe('summit');
    expect(getZone(100)).toBe('summit');
  });

  it('each zone has events defined', () => {
    (['ruins', 'mines', 'library', 'temple', 'summit'] as const).forEach((zone) => {
      expect(DUNGEON_EVENTS[zone].length).toBeGreaterThan(0);
    });
  });
});

describe('dungeon-events', () => {
  it('rollEvent returns valid type', () => {
    const valid = ['battle', 'treasure', 'trap', 'heal', 'merchant', 'lore', 'puzzle'];
    for (let i = 0; i < 50; i++) {
      const ev = rollEvent(5);
      expect(valid).toContain(ev.type);
      expect(ev.weight).toBeGreaterThan(0);
    }
  });

  it('ruins zone has goblin_ambush with weight 55', () => {
    const ruins = DUNGEON_EVENTS.ruins;
    const ambush = ruins.find((e) => e.id === 'goblin_ambush');
    expect(ambush?.weight).toBe(55);
    expect(ambush?.type).toBe('battle');
  });

  it('summit has highest gold rewards', () => {
    const summitGold = DUNGEON_EVENTS.summit.filter((e) => e.effect?.gold).map((e) => e.effect!.gold!);
    const ruinsGold = DUNGEON_EVENTS.ruins.filter((e) => e.effect?.gold).map((e) => e.effect!.gold!);

    expect(Math.max(...summitGold)).toBeGreaterThan(Math.max(...ruinsGold));
  });
});

describe('dungeon-drops', () => {
  it('all bases have drops', () => {
    expect(DUNGEON_DROPS.slime.length).toBeGreaterThan(0);
    expect(DUNGEON_DROPS.guardian.length).toBeGreaterThan(0);
  });

  it('boss drops contain equipment', () => {
    const slimeBoss = BOSS_DROPS.slime;
    expect(slimeBoss.some((d) => d.id === 'slime_crown')).toBe(true);
  });

  it('guardian boss drops mythic Nova Essence', () => {
    const mythic = BOSS_DROPS.guardian.find((d) => d.rarity === 'Mythic');
    expect(mythic).toBeDefined();
    expect(mythic?.name).toBe('Nova Essence');
    expect(mythic?.sellPrice).toBe(3000);
  });
});
