import { describe, it, expect } from 'vitest';
import { ACTION_COST } from '../../../src/lib/rpg/actions';

describe('Action Costs', () => {
  it('all actions have cost', () => {
    expect(ACTION_COST.hunt).toBe(10);
    expect(ACTION_COST.cook).toBe(5);
    expect(ACTION_COST.dungeon).toBe(3);
  });

  it('dungeon cheapest', () => {
    expect(ACTION_COST.dungeon).toBeLessThan(ACTION_COST.hunt);
  });
});
