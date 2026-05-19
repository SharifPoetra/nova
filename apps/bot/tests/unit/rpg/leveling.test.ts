import { describe, it, expect } from 'vitest';
import { getExpNeeded, getScaledExp, checkLevelUp } from '../../../src/lib/rpg/leveling';
import type { IUser } from '@nova/db';

describe('Leveling System', () => {
  it('exp needed scales correctly', () => {
    expect(getExpNeeded(1)).toBe(100);
    expect(getExpNeeded(5)).toBeGreaterThan(getExpNeeded(1));
    expect(getExpNeeded(10)).toBeGreaterThan(1000);
  });

  it('scaled exp increases with level', () => {
    const base = 10;
    const low = getScaledExp(base, 1, 'hunt');
    const high = getScaledExp(base, 20, 'hunt');
    expect(high).toBeGreaterThan(low);
  });

  it('elite gives 2.5x', () => {
    const normal = getScaledExp(10, 5, 'hunt', false);
    const elite = getScaledExp(10, 5, 'hunt', true);
    expect(elite).toBeGreaterThan(normal * 2);
  });

  it('checkLevelUp levels up correctly', () => {
    const user = {
      level: 1,
      exp: 150,
      maxHp: 100,
      attack: 10,
      maxStamina: 100,
    } as unknown as IUser;

    const result = checkLevelUp(user);
    expect(result).not.toBeNull();
    expect(user.level).toBe(2);
    expect(user.maxHp).toBe(120);
  });
});
