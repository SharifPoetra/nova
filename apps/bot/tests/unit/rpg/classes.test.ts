import { describe, it, expect } from 'vitest';
import { CLASSES, getClass } from '../../../src/lib/rpg/classes';

describe('Classes', () => {
  it('all classes balanced', () => {
    expect(CLASSES.warrior.baseHp).toBeGreaterThan(CLASSES.mage.baseHp);
    expect(CLASSES.mage.baseAtk).toBeGreaterThan(CLASSES.warrior.baseAtk);
    expect(CLASSES.rogue.baseCritRate).toBeGreaterThan(0.1);
  });

  it('getClass returns data', () => {
    const warrior = getClass('warrior');
    expect(warrior?.skillId).toBe('rage');
  });
});
