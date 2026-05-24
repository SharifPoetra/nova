import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlayerStats, applyPassives } from '../../../src/lib/rpg/combat';
import type { IUser } from '@nova/db';

// Mock Item.find biar return equipment palsu
vi.mock('@nova/db', async () => {
  const actual = await vi.importActual('@nova/db');
  return {
    ...actual,
    Item: {
      find: vi.fn(({ itemId: { $in } }) => ({
        lean: () =>
          Promise.resolve(
            $in
              .map((id: string) => {
                const mockItems: Record<string, any> = {
                  iron_sword: { itemId: 'iron_sword', slot: 'weapon', stats: { atk: 12 } },
                  obsidian_plate: {
                    itemId: 'obsidian_plate',
                    slot: 'armor',
                    stats: { hp: 50, def: 5 },
                  },
                  hunter_bow: {
                    itemId: 'hunter_bow',
                    slot: 'weapon',
                    stats: { atk: 15, critDmg: 1.8 },
                  },
                };
                return mockItems[id];
              })
              .filter(Boolean),
          ),
      })),
    },
  };
});

const baseUser: IUser = {
  discordId: '123',
  username: 'test',
  class: 'warrior',
  level: 1,
  exp: 0,
  hp: 120,
  maxHp: 120,
  attack: 10,
  stamina: 100,
  maxStamina: 100,
  balance: 0,
  bank: 0,
  items: [],
  buffs: [],
  equipped: { weapon: null, helmet: null, armor: null, accessory: null, tool: null },
  skillCooldowns: new Map(),
} as unknown as IUser;

describe('getPlayerStats()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('1.7: return base stats kalau no equipment', async () => {
    const stats = await getPlayerStats(baseUser);
    expect(stats.atk).toBe(13); // 12 + floor(1.5)
    expect(stats.maxHp).toBe(130); // 120 + 10
    expect(stats.def).toBe(0);
    expect(stats.critRate).toBe(0.05);
    expect(stats.critDmg).toBe(1.5);
    expect(stats.availableSkills).toContain('rage');
  });

  it('1.7: equip iron_sword {atk:12} harus nambah atk', async () => {
    const user = { ...baseUser, equipped: { ...baseUser.equipped, weapon: 'iron_sword' } };
    const stats = await getPlayerStats(user);
    expect(stats.atk).toBe(25); // 13 + 12
  });

  it('equip obsidian_plate {hp:50, def:5} harus nambah maxHp + def', async () => {
    const user = { ...baseUser, equipped: { ...baseUser.equipped, armor: 'obsidian_plate' } };
    const stats = await getPlayerStats(user);
    expect(stats.maxHp).toBe(180); // 130 + 50
    expect(stats.def).toBe(5);
  });

  it('equip hunter_bow {atk:15, critDmg:1.8} harus stack critDmg', async () => {
    const user = {
      ...baseUser,
      class: 'rogue' as const,
      equipped: { ...baseUser.equipped, weapon: 'hunter_bow' },
    };
    const stats = await getPlayerStats(user);
    expect(stats.atk).toBe(30); // rogue 14+1=15, +15=30
    expect(stats.critDmg).toBeCloseTo(3.3); // 1.5 + 1.8
    expect(stats.availableSkills).toContain('backstab');
  });

  it('buff atk +30% harus naikin atk', async () => {
    const user = {
      ...baseUser,
      buffs: [{ type: 'atk', value: 0.3, expires: new Date(Date.now() + 10000), battle: false }],
    };
    const stats = await getPlayerStats(user);
    expect(stats.atk).toBe(16); // floor(13 * 1.3) = 16
    expect(stats.activeBuffs).toHaveLength(1);
  });
});

describe('applyPassives() - Berserker Blood', () => {
  const user = {
    class: 'warrior',
    level: 10,
    discordId: '1',
    username: 'berserker',
  } as unknown as IUser;

  const makeBase = (hp: number, maxHp = 100) => ({
    hp,
    maxHp,
    atk: 100,
    def: 0,
    critRate: 0.05,
    critDmg: 2,
    element: 'phys' as const,
    activeBuffs: [],
    availableSkills: [],
    flags: {},
  });

  it('0% bonus at 100% HP', () => {
    const res = applyPassives(makeBase(100), user);
    expect(res.atk).toBe(100);
  });

  it('+1% at 90% HP (1 step)', () => {
    const res = applyPassives(makeBase(90), user);
    expect(res.atk).toBe(101); // sekarang pass setelah +1e-6
  });

  it('+5% at 50% HP (5 steps)', () => {
    const res = applyPassives(makeBase(50), user);
    expect(res.atk).toBe(105);
  });

  it('+9% at 10% HP (9 steps)', () => {
    const res = applyPassives(makeBase(10), user);
    expect(res.atk).toBe(109);
  });

  it('+10% at 0% HP (10 steps max)', () => {
    const res = applyPassives(makeBase(0), user);
    expect(res.atk).toBe(110);
  });
});

describe('applyPassives() - Integration with getPlayerStats', () => {
  it('berserker passive applied in getPlayerStats', async () => {
    const testUser = {
      ...baseUser,
      level: 10,
      class: 'warrior' as const,
      hp: 110, // 50% dari maxHp 220
      maxHp: 220,
      equipped: { ...baseUser.equipped, weapon: 'iron_sword' },
    };

    const stats = await getPlayerStats(testUser);
    // base warrior lvl10: atk = 12 + floor(15) = 27, + iron 12 = 39
    // HP 50% → 5 step → +5% → 39 * 1.05 = 40.95 → floor 40
    expect(stats.atk).toBe(40);

    // passive TIDAK masuk availableSkills
    expect(stats.availableSkills).not.toContain('berserker_passive');
    expect(stats.availableSkills).toContain('rage');
  });
});
