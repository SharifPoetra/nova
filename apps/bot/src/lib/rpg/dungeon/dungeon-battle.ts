import { Message, ComponentType } from 'discord.js';
import type { IUser } from '@nova/db';
import { sleep } from '../../utils.ts';
import type { RunState } from './dungeon-state.ts';
import { buildBattleEmbed, getBattleButtons } from './dungeon-ui.ts';
import { getSkillCooldown } from '../combat.ts';
import { BattleEngine } from '../battle-engine.ts';
import type { TFunction } from 'i18next';
import { i18nMonster } from '../../i18n/display.ts';

interface BattleParams {
  player: IUser;
  monster: any;
  floor: number;
  lore: string;
  isBoss: boolean;
  isElite: boolean;
  state: RunState;
  msg: Message;
  username: string;
  t: TFunction;
}

export async function runInteractiveBattle(params: BattleParams) {
  const { player, monster, floor, lore, isBoss, isElite, state, msg, username, t } = params;
  const monsterName = i18nMonster('dungeon', monster.id, t);

  const baseHp = 50 + floor * 8;
  const baseAtk = 8 + floor * 1.5;

  // Smoothing boss HP F50+
  let bossHpMult = 3.5;
  if (floor >= 75)
    bossHpMult = 3.15; // F75: 2.050, F100: 2.677
  else if (floor >= 60)
    bossHpMult = 3.25; // F60: ~1.690
  else if (floor >= 50) bossHpMult = 3.35; // F50: ~1.507

  const monsterMaxHp = Math.floor(
    isBoss ? baseHp * bossHpMult : isElite ? baseHp * 1.8 : baseHp * (0.8 + Math.random() * 0.4),
  );
  const monsterAtk = Math.floor(isBoss ? baseAtk * 2.2 : baseAtk);
  const monsterDef = Math.floor(floor * 0.5);

  const battleLog: string[] = [];

  const engine = new BattleEngine(
    player,
    {
      id: monster.id,
      name: monsterName,
      emoji: monster.emoji,
      hp: monsterMaxHp,
      maxHp: monsterMaxHp,
      atk: monsterAtk,
      def: monsterDef,
      element: monster.element ?? 'physical',
      isBoss,
      isElite,
    },
    {
      onLog: (m) => battleLog.push(m),
      t,
    },
  );

  await engine.init();
  let stats = engine.playerStats;

  const updateBattle = async (showButtons = true) => {
    const skillButtons = engine.getPlayerSkills().map((s) => ({
      id: s.id,
      name: s.name,
      cd: getSkillCooldown(player, s.id),
      canUseSkill: engine.canUseSkill(s.id).ok,
    }));

    const embed = buildBattleEmbed({
      monsterName,
      monsterEmoji: monster.emoji,
      monsterHp: engine.enemyHp,
      monsterMaxHp,
      monsterElement: monster.element ?? 'physical',
      playerName: username,
      playerHp: player.hp,
      playerMaxHp: stats.maxHp,
      lore,
      action: battleLog.slice(-5).join('\n'),
      isBoss,
      isElite,
      t,
    });

    const components = showButtons ? [getBattleButtons(skillButtons, t)] : [];
    await msg.edit({ embeds: [embed], components });
  };

  await updateBattle(true);
  await sleep(600);

  while (!engine.isBattleOver()) {
    await updateBattle(true);

    const turn = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === player.discordId && (i.customId === 'atk' || i.customId.startsWith('skl_')),
        time: 30_000,
        componentType: ComponentType.Button,
      })
      .catch(() => null);

    if (!turn) {
      await updateBattle(false);
      const { damage } = await engine.playerAttack('basic');
      state.dealt += damage;
      battleLog.push(t('commands/dungeon:battle_auto', { damage }));
      await sleep(700);
    } else {
      await turn.deferUpdate();
      await updateBattle(false);

      if (turn.customId === 'atk') {
        const { damage } = await engine.playerAttack('basic');
        state.dealt += damage;
      } else if (turn.customId.startsWith('skl_')) {
        const skillId = turn.customId.replace('skl_', '');
        const beforeHp = engine.enemyHp;
        await engine.playerAttack(skillId);
        state.dealt += Math.max(0, beforeHp - engine.enemyHp);
      }
    }

    await updateBattle(false);
    await sleep(700);

    if (engine.enemyHp <= 0) {
      await engine.endTurn();
      break;
    }

    // Monster turn
    await updateBattle(false);
    const { damage: monsterDamage } = engine.enemyAttack();
    state.taken += monsterDamage;

    await updateBattle(false);
    await sleep(600);
    await engine.endTurn();

    stats = engine.playerStats;
    player.hp = Math.max(0, player.hp);
  }

  await player.updateOne({
    $set: {
      hp: player.hp,
      stamina: player.stamina,
      buffs: player.buffs,
      skillCooldowns: player.skillCooldowns,
    },
  });

  return { victory: engine.enemyHp <= 0, playerHp: player.hp, monsterHp: engine.enemyHp };
}
