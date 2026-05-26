import {
  getPlayerStats,
  calculateDamage,
  tickBuffs,
  tickSkillCooldowns,
  getSkillCooldown,
  setSkillCooldown,
  type PlayerStats,
} from './combat';
import { getSkill, type SkillData, type SkillContext } from './skills';
import type { IUser, Element } from '@nova/db';

export interface EnemyStats {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  element?: Element;
  critRate?: number;
  critDmg?: number;
  isBoss?: boolean;
  isElite?: boolean;
}

export interface BattleResult {
  victory: boolean;
  playerHp: number;
  enemyHp: number;
  totalDealt: number;
  totalTaken: number;
  turns: number;
  log: string[];
}

export interface BattleEngineOptions {
  allowFlee?: boolean;
  onLog?: (msg: string) => void;
}

export class BattleEngine {
  private user: IUser;
  private enemy: EnemyStats;
  private options: BattleEngineOptions;

  public playerStats: PlayerStats;
  public enemyHp: number;
  public turn: number = 0;
  public totalDealt: number = 0;
  public totalTaken: number = 0;
  public log: string[] = [];
  public enemyStunned: number = 0;

  constructor(user: IUser, enemy: EnemyStats, options: BattleEngineOptions = {}) {
    this.user = user;
    this.enemy = { ...enemy };
    this.enemyHp = enemy.hp;
    this.options = options;
    this.playerStats = null as any;
  }

  async init() {
    this.playerStats = await getPlayerStats(this.user);
    const tag = this.enemy.isBoss ? ' [BOSS]' : this.enemy.isElite ? ' [ELITE]' : '';
    this.logPush(`${this.enemy.emoji} **${this.enemy.name}**${tag} appeared!`);
  }

  public logPush(msg: string) {
    this.log.push(msg);
    this.options.onLog?.(msg);
  }

  getPlayerSkills(): SkillData[] {
    return this.playerStats.availableSkills
      .map((id) => getSkill(id))
      .filter(Boolean) as SkillData[];
  }

  canUseSkill(skillId: string): { ok: boolean; reason?: string } {
    const skill = getSkill(skillId);
    if (!skill) return { ok: false, reason: 'Skill not found' };

    const cd = getSkillCooldown(this.user, skillId);
    if (cd > 0) return { ok: false, reason: `Cooldown ${cd} turns` };

    if (this.user.stamina < skill.staminaCost) {
      return { ok: false, reason: `Low stamina (${this.user.stamina}/${skill.staminaCost})` };
    }

    return { ok: true };
  }

  async playerAttack(
    skillId?: string,
  ): Promise<{ damage: number; isCrit: boolean; healed: number }> {
    await this.refreshStats();

    let damage = 0;
    let isCrit = false;
    let healed = 0;

    if (!skillId || skillId === 'basic') {
      const result = calculateDamage(
        this.playerStats,
        { def: this.enemy.def, element: this.enemy.element },
        1.0,
      );
      damage = result.damage;
      isCrit = result.isCrit;
      this.logPush(`🗡️ You attack **${damage}**${isCrit ? ' 💥CRIT!' : ''}`);
    } else {
      const skill = getSkill(skillId);
      if (!skill) {
        this.logPush('❌ Skill not found');
        return { damage: 0, isCrit: false, healed: 0 };
      }

      const check = this.canUseSkill(skillId);
      if (!check.ok) {
        this.logPush(`⏳ ${skill.name}: ${check.reason}`);
        return { damage: 0, isCrit: false, healed: 0 };
      }

      const ctx: SkillContext = {
        user: this.user,
        stats: this.playerStats,
        enemy: { hp: this.enemyHp, def: this.enemy.def, element: this.enemy.element },
        t: (k) => k,
        addBuff: (type, value, duration) => {
          this.user.buffs.push({
            type: type as any,
            value,
            turnsLeft: duration,
            battle: true,
          });
        },
        addLog: (text) => this.logPush(text),
      };

      const result = skill.use(ctx);
      damage = result.damage;
      healed = result.heal;
      isCrit = result.isCrit;

      this.user.stamina = Math.max(0, this.user.stamina - skill.staminaCost);
      setSkillCooldown(this.user, skill);

      if (healed > 0) {
        this.user.hp = Math.min(this.playerStats.maxHp, this.user.hp + healed);
      }
    }

    this.enemyHp = Math.max(0, this.enemyHp - damage);
    this.totalDealt += damage;

    await this.refreshStats();
    return { damage, isCrit, healed };
  }

  enemyAttack(): { damage: number; isCrit: boolean; blocked: number } {
    const dodgeChance = (this.playerStats as any).dodge ?? 0;
    if (Math.random() < dodgeChance) {
      this.logPush(`💨 You dodged!`);
      return { damage: 0, isCrit: false, blocked: 0 };
    }

    if (this.enemyStunned > 0) {
      this.enemyStunned--;
      this.logPush(`💫 ${this.enemy.name} is stunned!`);
      return { damage: 0, isCrit: false, blocked: 0 };
    }

    const enemyAsAttacker: PlayerStats = {
      hp: this.enemyHp,
      maxHp: this.enemy.maxHp,
      atk: this.enemy.atk,
      def: this.enemy.def,
      critRate: this.enemy.critRate ?? 0.05,
      critDmg: this.enemy.critDmg ?? 1.5,
      element: this.enemy.element ?? 'physical',
      activeBuffs: [],
      availableSkills: [],
    };

    const result = calculateDamage(
      enemyAsAttacker,
      { def: this.playerStats.def, element: this.playerStats.element },
      1.0,
    );

    let damage = result.damage;
    let blocked = 0;

    if ((this.playerStats as any).flags?.warrior_block && Math.random() < 0.2) {
      blocked = Math.floor(damage * 0.3);
      damage -= blocked;
    }
    if (this.playerStats.flags?.mana_shield && this.user.stamina > 0) {
      const absorb = Math.floor(damage * 0.2);
      const staminaCost = Math.min(absorb, this.user.stamina);
      damage -= staminaCost;
      this.user.stamina -= staminaCost;
      if (staminaCost > 0) this.logPush(`🔮 Mana Shield absorbed ${staminaCost}!`);
    }

    damage = Math.max(1, damage);
    this.user.hp = Math.max(0, this.user.hp - damage);
    this.totalTaken += damage;

    this.logPush(
      `${this.enemy.emoji} ${this.enemy.name} hits **${damage}**${blocked ? ` (blocked ${blocked})` : ''}${result.isCrit ? ' 💥' : ''}`,
    );

    return { damage, isCrit: result.isCrit, blocked };
  }

  async endTurn() {
    tickBuffs(this.user);
    tickSkillCooldowns(this.user);
    this.turn++;
    await this.refreshStats();
    this.user.hp = Math.min(this.user.hp, this.playerStats.maxHp);
  }

  private async refreshStats() {
    this.playerStats = await getPlayerStats(this.user);
  }

  isBattleOver(): boolean {
    return this.user.hp <= 0 || this.enemyHp <= 0;
  }

  getResult(): BattleResult {
    return {
      victory: this.enemyHp <= 0 && this.user.hp > 0,
      playerHp: this.user.hp,
      enemyHp: this.enemyHp,
      totalDealt: this.totalDealt,
      totalTaken: this.totalTaken,
      turns: this.turn,
      log: [...this.log],
    };
  }

  setEnemyStun(turns: number) {
    this.enemyStunned = turns;
  }
}

export async function runBattle(
  user: IUser,
  enemy: EnemyStats,
  actionProvider: () => Promise<'attack' | string | 'flee'>,
  options: BattleEngineOptions = {},
): Promise<BattleResult> {
  const engine = new BattleEngine(user, enemy, options);
  await engine.init();

  while (!engine.isBattleOver()) {
    const action = await actionProvider();

    if (action === 'flee' && options.allowFlee) {
      engine.logPush('🏃 You fled!');
      break;
    }

    if (action === 'attack' || action === 'basic') {
      await engine.playerAttack();
    } else {
      await engine.playerAttack(action);
    }

    if (engine.enemyHp <= 0) break;

    engine.enemyAttack();
    await engine.endTurn();
  }

  return engine.getResult();
}
