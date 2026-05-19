import { describe, it, expect } from 'vitest';
import { applyPassiveRegen, getAtkBuff } from '../../../src/lib/rpg/buffs';
import type { IUser } from '@nova/db';

describe('Buffs', () => {
  it('applyPassiveRegen adds stamina', () => {
    const now = new Date();
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60000);
    
    const user = {
      stamina: 50,
      maxStamina: 100,
      lastPassive: fiveMinsAgo,
      buffs: [{
        type: 'stamina_regen',
        value: 2,
        expires: new Date(now.getTime() + 60000),
      }],
    } as unknown as IUser;

    applyPassiveRegen(user);
    expect(user.stamina).toBeGreaterThan(50);
  });

  it('getAtkBuff sums active buffs', () => {
    const user = {
      buffs: [
        { type: 'atk', value: 0.3, expires: new Date(Date.now() + 10000) },
        { type: 'atk', value: 0.2, expires: new Date(Date.now() + 10000) },
      ],
    } as unknown as IUser;

    expect(getAtkBuff(user)).toBeCloseTo(0.5);
  });
});
