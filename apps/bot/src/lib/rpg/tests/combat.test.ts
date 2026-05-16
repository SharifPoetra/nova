import { describe, it, expect, beforeEach } from 'vitest';
import { getPlayerStats } from '../combat';
import { EQUIPMENTS } from '../equipment';
import type { IUser } from '@nova/db';

// Mock user base warrior lv1
const mockUser: IUser = {
  discordId: '123',
  username: 'test',
  class: 'warrior',
  level: 1,
  exp: 0,
  hp: 120,
  maxHp: 120,
  attack: 10, // ini bakal di-ignore, pake baseAtk dari class
  stamina: 100,
  maxStamina: 100,
  balance: 0,
  bank: 0,
  items: [],
  buffs: [],
  equipped: { weapon: null, helmet: null, armor: null, accessory: null },
} as IUser;

describe('getPlayerStats()', () => {
  it('1.7: return base stats kalau no equipment', () => {
    const stats = getPlayerStats(mockUser);
    // warrior: baseAtk 12 + lv1*1.5 = 13.5 → floor 13
    expect(stats.atk).toBe(13);
    expect(stats.def).toBe(0);
    expect(stats.critRate).toBe(0.05);
    expect(stats.critDmg).toBe(1.5);
  });

  it('1.7: equip iron_sword {atk:12} harus nambah atk', () => {
    const userWithSword = {
     ...mockUser,
      equipped: {...mockUser.equipped, weapon: 'iron_sword' },
    };
    const stats = getPlayerStats(userWithSword);

    // base 13 + iron_sword 12 = 25
    expect(stats.atk).toBe(25);
    expect(stats.def).toBe(0); // iron_sword gak ada def
  });

  it('equip obsidian_plate {hp:50, def:5} harus nambah maxHp + def', () => {
    const userWithArmor = {
     ...mockUser,
      equipped: {...mockUser.equipped, armor: 'obsidian_plate' },
    };
    const stats = getPlayerStats(userWithArmor);

    // warrior baseHp 120 + lv1*10 = 130, + 50 = 180
    expect(stats.maxHp).toBe(180);
    expect(stats.def).toBe(5);
    expect(stats.atk).toBe(13); // atk gak berubah
  });

  it('equip hunter_bow {atk:15, critDmg:1.8} harus stack critDmg', () => {
    const userWithBow = {
     ...mockUser,
      class: 'rogue', // rogue baseCritDmg 1.5
      equipped: {...mockUser.equipped, weapon: 'hunter_bow' },
    };
    const stats = getPlayerStats(userWithBow);

    // rogue baseAtk 14 + lv1*1.5 = 15, + 15 = 30
    expect(stats.atk).toBe(30);
    // base 1.5 + 1.8 = 3.3
    expect(stats.critDmg).toBe(3.3);
  });
});
