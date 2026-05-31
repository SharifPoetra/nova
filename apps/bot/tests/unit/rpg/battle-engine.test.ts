import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BattleEngine, type EnemyStats } from '../../../src/lib/rpg/battle-engine';
import type { IUser } from '@nova/db';

vi.mock('../../../src/lib/rpg/combat', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/rpg/combat')>('../../../src/lib/rpg/combat');
  return {
    ...actual,
    getPlayerStats: vi.fn(async (user: IUser) => ({
      hp: user.hp,
      maxHp: user.maxHp ?? 100,
      atk: 20,
      def: 5,
      critRate: 0.05,
      critDmg: 1.5,
      element: 'phys' as const,
      activeBuffs: [],
      availableSkills: ['rage', 'fireball', 'backstab'],
    })),
    calculateDamage: vi.fn((attacker, defender, mult = 1) => {
      const base = Math.floor(attacker.atk * mult);
      const isCrit = Math.random() < attacker.critRate;
      const dmg = isCrit ? Math.floor(base * attacker.critDmg) : base;
      const final = Math.max(1, dmg - (defender.def ?? 0));
      return { damage: final, isCrit, elementMult: 1 };
    }),
    tickBuffs: vi.fn(),
    tickSkillCooldowns: vi.fn(),
    getSkillCooldown: vi.fn(() => 0),
    setSkillCooldown: vi.fn(),
  };
});

vi.mock('../../../src/lib/rpg/skills', async () => {
  const actual = await vi.importActual<typeof import('../../../src/lib/rpg/skills')>('../../../src/lib/rpg/skills');
  return {
    ...actual,
    getSkill: vi.fn((id: string) => {
      const skills: any = {
        rage: {
          id: 'rage',
          name: 'Rage',
          staminaCost: 20,
          cooldownTurns: 5,
          use: (ctx: any) => {
            ctx.addBuff('atk', 0.3, 3);
            return { damage: 15, heal: 0, isCrit: false };
          },
        },
        fireball: {
          id: 'fireball',
          name: 'Fireball',
          staminaCost: 25,
          cooldownTurns: 3,
          use: () => ({ damage: 30, heal: 0, isCrit: false }),
        },
      };
      return skills[id] ?? null;
    }),
  };
});

function createMockUser(overrides: Partial<IUser> = {}): IUser {
  return {
    discordId: '123',
    hp: 100,
    maxHp: 100,
    level: 10,
    class: 'warrior',
    stamina: 100,
    maxStamina: 100,
    buffs: [],
    skillCooldowns: new Map(),
    equipped: { weapon: null, helmet: null, armor: null, accessory: null, tool: null },
    ...overrides,
  } as unknown as IUser;
}

function createEnemy(overrides: Partial<EnemyStats> = {}): EnemyStats {
  return {
    id: 'goblin',
    name: 'Goblin',
    emoji: '👺',
    hp: 50,
    maxHp: 50,
    atk: 10,
    def: 2,
    ...overrides,
  };
}

describe('BattleEngine', () => {
  let user: IUser;
  let enemy: EnemyStats;

  beforeEach(() => {
    user = createMockUser();
    enemy = createEnemy();
    vi.clearAllMocks();
  });

  it('init() loads player stats', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    expect(engine.playerStats.atk).toBe(20);
    expect(engine.enemyHp).toBe(50);
    expect(engine.log.length).toBe(1);
  });

  it('player basic attack reduces enemy HP', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const result = await engine.playerAttack();
    expect(result.damage).toBeGreaterThan(0);
    expect(engine.enemyHp).toBeLessThan(50);
    expect(engine.totalDealt).toBe(result.damage);
  });

  it('player skill consumes stamina and deals damage', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const beforeStamina = user.stamina;
    await engine.playerAttack('fireball');
    expect(user.stamina).toBe(beforeStamina - 25);
    expect(engine.enemyHp).toBe(20);
  });

  it('enemy attack reduces player HP', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const beforeHp = user.hp;
    const result = engine.enemyAttack();
    expect(result.damage).toBeGreaterThan(0);
    expect(user.hp).toBeLessThan(beforeHp);
    expect(engine.totalTaken).toBe(result.damage);
  });

  it('enemy attack respects player DEF', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const result = engine.enemyAttack();
    expect(result.damage).toBe(5);
  });

  it('battle ends when enemy HP reaches 0', async () => {
    const weakEnemy = createEnemy({ hp: 10, maxHp: 10 });
    const engine = new BattleEngine(user, weakEnemy);
    await engine.init();
    await engine.playerAttack();
    expect(engine.isBattleOver()).toBe(true);
    expect(engine.getResult().victory).toBe(true);
  });

  it('battle ends when player HP reaches 0', async () => {
    user.hp = 5;
    const strongEnemy = createEnemy({ atk: 50 });
    const engine = new BattleEngine(user, strongEnemy);
    await engine.init();
    engine.enemyAttack();
    expect(engine.isBattleOver()).toBe(true);
    expect(engine.getResult().victory).toBe(false);
  });

  it('endTurn increments turn counter', async () => {
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    expect(engine.turn).toBe(0);
    await engine.endTurn();
    expect(engine.turn).toBe(1);
  });

  it('warrior block flag reduces damage 20% of the time', async () => {
    const { getPlayerStats } = await import('../../../src/lib/rpg/combat');
    vi.mocked(getPlayerStats).mockResolvedValueOnce({
      hp: 100,
      maxHp: 100,
      atk: 20,
      def: 5,
      critRate: 0.05,
      critDmg: 1.5,
      element: 'phys',
      activeBuffs: [],
      availableSkills: [],
      flags: { warrior_block: true },
    } as any);
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.1);
    const result = engine.enemyAttack();
    Math.random = originalRandom;
    expect(result.blocked).toBeGreaterThan(0);
  });

  it('dodge flag avoids damage', async () => {
    const { getPlayerStats } = await import('../../../src/lib/rpg/combat');
    vi.mocked(getPlayerStats).mockResolvedValueOnce({
      hp: 100,
      maxHp: 100,
      atk: 20,
      def: 5,
      critRate: 0.05,
      critDmg: 1.5,
      element: 'phys',
      activeBuffs: [],
      availableSkills: [],
      dodge: 1.0,
    } as any);
    const engine = new BattleEngine(user, enemy);
    await engine.init();
    const result = engine.enemyAttack();
    expect(result.damage).toBe(0);
    expect(engine.log.some((l) => l.includes('dodged'))).toBe(true); // FIXED: was 'menghindar'
  });

  it('runBattle helper works for auto battle', async () => {
    const { runBattle } = await import('../../../src/lib/rpg/battle-engine');
    const weakEnemy = createEnemy({ hp: 20 });
    let actionCount = 0;
    const result = await runBattle(user, weakEnemy, async () => {
      actionCount++;
      return 'attack';
    });
    expect(result.victory).toBe(true);
    expect(actionCount).toBeGreaterThan(0);
    expect(result.turns).toBeGreaterThan(0);
  });
});
