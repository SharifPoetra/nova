import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlayerStats } from '../../../src/lib/rpg/combat';
import type { IUser } from '@nova/db';

// Mock Item.find biar return equipment palsu
vi.mock('@nova/db', async () => {
  const actual = await vi.importActual('@nova/db');
  return {
   ...actual,
    Item: {
      find: vi.fn(({ itemId: { $in } }) => ({
        lean: () => Promise.resolve(
          $in.map((id: string) => {
            const mockItems: Record<string, any> = {
              iron_sword: { itemId: 'iron_sword', slot: 'weapon', stats: { atk: 12 } },
              obsidian_plate: { itemId: 'obsidian_plate', slot: 'armor', stats: { hp: 50, def: 5 } },
              hunter_bow: { itemId: 'hunter_bow', slot: 'weapon', stats: { atk: 15, critDmg: 1.8 } },
            };
            return mockItems[id];
          }).filter(Boolean)
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
    const user = {...baseUser, equipped: {...baseUser.equipped, weapon: 'iron_sword' } };
    const stats = await getPlayerStats(user);
    expect(stats.atk).toBe(25); // 13 + 12
  });

  it('equip obsidian_plate {hp:50, def:5} harus nambah maxHp + def', async () => {
    const user = {...baseUser, equipped: {...baseUser.equipped, armor: 'obsidian_plate' } };
    const stats = await getPlayerStats(user);
    expect(stats.maxHp).toBe(180); // 130 + 50
    expect(stats.def).toBe(5);
  });

  it('equip hunter_bow {atk:15, critDmg:1.8} harus stack critDmg', async () => {
    const user = {
     ...baseUser,
      class: 'rogue' as const,
      equipped: {...baseUser.equipped, weapon: 'hunter_bow' }
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
