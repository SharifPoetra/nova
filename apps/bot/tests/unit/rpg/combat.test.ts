import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlayerStats, applyPassives } from '../../../src/lib/rpg/combat';
import type { IUser } from '@nova/db';

vi.mock('@nova/db', async () => {
  const actual = await vi.importActual('@nova/db');
  return {
    ...actual,
    Item: {
      find: vi.fn(({ itemId: { $in } }) => ({
        lean: () =>
          Promise.resolve(
            $in
              .map(
                (id: string) =>
                  ({
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
                  })[id],
              )
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

const makeStats = (hp: number, maxHp = 100, atk = 100, critRate = 0.05, critDmg = 1.5) => ({
  hp,
  maxHp,
  atk,
  def: 0,
  critRate,
  critDmg,
  element: 'phys' as const,
  activeBuffs: [],
  availableSkills: [],
  flags: {},
});

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
      level: 1,
      equipped: { ...baseUser.equipped, weapon: 'hunter_bow' },
    };
    const stats = await getPlayerStats(user);
    // rogue baseAtk 14 +1 =15, +15 =30
    expect(stats.atk).toBe(30);
    // base critDmg 1.5 + 1.8 = 3.3
    expect(stats.critDmg).toBeCloseTo(3.3);
    expect(stats.availableSkills).toContain('backstab');
  });

  it('buff atk +30% harus naikin atk', async () => {
    const user = {
      ...baseUser,
      buffs: [{ type: 'atk', value: 0.3, expires: new Date(Date.now() + 10000), battle: false }],
    };
    const stats = await getPlayerStats(user);
    expect(stats.atk).toBe(16); // floor(13 * 1.3)
    expect(stats.activeBuffs).toHaveLength(1);
  });
});

describe('applyPassives() - Berserker Blood', () => {
  const user = { class: 'warrior', level: 10 } as unknown as IUser;

  it('0% bonus at 100% HP', () => {
    const res = applyPassives(makeStats(100), user);
    expect(res.atk).toBe(100);
  });
  it('+1% at 90% HP (1 step)', () => {
    const res = applyPassives(makeStats(90), user);
    expect(res.atk).toBe(101);
  });
  it('+5% at 50% HP (5 steps)', () => {
    const res = applyPassives(makeStats(50), user);
    expect(res.atk).toBe(105);
  });
  it('+9% at 10% HP (9 steps)', () => {
    const res = applyPassives(makeStats(10), user);
    expect(res.atk).toBe(109);
  });
  it('+10% at 0% HP (10 steps max)', () => {
    const res = applyPassives(makeStats(0), user);
    expect(res.atk).toBe(110);
  });
});

describe('applyPassives() - Shadow Dance', () => {
  const user = { class: 'rogue', level: 10 } as unknown as IUser;
  it('+15% critRate when HP >70%', () => {
    const res = applyPassives(makeStats(80, 100, 50, 0.15), user);
    expect(res.critRate).toBeCloseTo(0.3);
  });
  it('no bonus at 70%', () => {
    const res = applyPassives(makeStats(70, 100, 50, 0.15), user);
    expect(res.critRate).toBeCloseTo(0.15);
  });
  it('no bonus below', () => {
    const res = applyPassives(makeStats(50, 100, 50, 0.15), user);
    expect(res.critRate).toBeCloseTo(0.15);
  });
});

describe('applyPassives() - Arcane Intellect', () => {
  const user = { class: 'mage', level: 10 } as unknown as IUser;
  it('+25% critDmg when HP >50%', () => {
    const res = applyPassives(makeStats(60), user);
    expect(res.critDmg).toBeCloseTo(1.75);
  });
  it('no bonus at 50%', () => {
    const res = applyPassives(makeStats(50), user);
    expect(res.critDmg).toBeCloseTo(1.5);
  });
});

describe('applyPassives() - hp_loss steps', () => {
  const user = { class: 'warrior', level: 10 } as IUser;
  it('epsilon fix', () => {
    // 29% hp -> lost 71% -> 7 steps
    expect(applyPassives(makeStats(29), user).atk).toBe(107);
  });
});

describe('Integration with getPlayerStats', () => {
  it('berserker passive applied at 50% hp', async () => {
    const testUser = {
      ...baseUser,
      level: 10,
      class: 'warrior' as const,
      hp: 110, // 50% dari 220
      maxHp: 220,
      equipped: { ...baseUser.equipped, weapon: 'iron_sword' },
    };
    const stats = await getPlayerStats(testUser);
    // base 12+15=27 +12=39, +5% = 40.95 -> floor 40
    expect(stats.atk).toBe(40);
    expect(stats.availableSkills).not.toContain('berserker_passive');
  });

  it('rogue passive applied', async () => {
    const testUser = {
      ...baseUser,
      level: 10,
      class: 'rogue' as const,
      hp: 999, // akan di-cap ke maxHp (190) = 100%
    };
    const stats = await getPlayerStats(testUser);
    // base crit 0.15 + 0.15 = 0.30
    expect(stats.critRate).toBeCloseTo(0.3);
  });

  it('mage passive applied', async () => {
    const testUser = {
      ...baseUser,
      level: 10,
      class: 'mage' as const,
      hp: 999,
    };
    const stats = await getPlayerStats(testUser);
    // base 1.5 + 0.25 = 1.75
    expect(stats.critDmg).toBeCloseTo(1.75);
  });
});
