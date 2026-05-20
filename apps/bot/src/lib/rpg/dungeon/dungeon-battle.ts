import { Message, ComponentType } from 'discord.js';
import { IUser } from '@nova/db';
import { sleep } from '../../utils';
import { RunState } from './dungeon-state';
import { buildBattleEmbed, getBattleButtons } from './dungeon-ui';
import {
  getPlayerStats,
  calculateDamage,
  getSkillCooldown,
  setSkillCooldown,
  tickSkillCooldowns,
  tickBuffs,
} from '../combat';
import { getSkill, SkillContext } from '../skills';
import type { TFunction } from 'i18next';
import { i18nMonster } from '../display';

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
  let stats = await getPlayerStats(player);

  const baseHp = 50 + floor * 8;
  const baseAtk = 8 + floor * 1.5;
  const monsterMaxHp = Math.floor(
    isBoss ? baseHp * 3.5 : isElite ? baseHp * 1.8 : baseHp * (0.8 + Math.random() * 0.4),
  );
  const monsterAtk = Math.floor(isBoss ? baseAtk * 2.2 : baseAtk);
  const monsterDef = Math.floor(floor * 0.5);

  let monsterHp = monsterMaxHp;
  let playerHp = stats.hp;

  const playerSkillId = stats.availableSkills[0] ?? null;
  const playerSkill = playerSkillId ? getSkill(playerSkillId) : null;
  let isDefending = false;

  const battleLog: string[] = [];
  battleLog.push(
    t('commands/dungeon:battle_spawn', {
      emoji: monster.emoji,
      name: monsterName,
      elite: isElite ? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
      defaultValue: `**${monster.emoji} ${monsterName}** appeared!${isElite ? ' **ELITE!**' : ''}`,
    }),
  );

  const updateBattle = async (showButtons = true) => {
    const skillCd = playerSkill ? getSkillCooldown(player, playerSkill.id) : 0;
    const embed = buildBattleEmbed({
      monsterName,
      monsterEmoji: monster.emoji,
      monsterHp,
      monsterMaxHp,
      playerName: username,
      playerHp,
      playerMaxHp: stats.maxHp,
      lore,
      action: battleLog.slice(-5).join('\n'),
      isBoss,
      isElite,
      skillCd,
      t,
    });
    const components = showButtons
      ? [getBattleButtons(playerSkill?.name ?? 'Skill', skillCd, t)]
      : [];
    await msg.edit({ embeds: [embed], components });
  };

  await updateBattle(true);
  await sleep(600);

  while (monsterHp > 0 && playerHp > 0) {
    await updateBattle(true);

    const turn = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === player.discordId && ['atk', 'def', 'skl'].includes(i.customId),
        time: 30_000,
        componentType: ComponentType.Button,
      })
      .catch(() => null);

    if (!turn) {
      await updateBattle(false);
      const { damage } = calculateDamage(stats, { def: monsterDef }, 1.0);
      monsterHp -= damage;
      state.dealt += damage;
      battleLog.push(t('commands/dungeon:battle_auto', { damage }));
      await sleep(700);
    } else {
      await turn.deferUpdate();
      await updateBattle(false);

      if (turn.customId === 'atk') {
        const { damage, isCrit } = calculateDamage(stats, { def: monsterDef }, 1.0);
        monsterHp -= damage;
        state.dealt += damage;
        battleLog.push(
          t('commands/dungeon:player_hit', { damage, crit: `${isCrit ? '💥CRIT' : ''}` }),
        );
      } else if (turn.customId === 'def') {
        isDefending = true;
        battleLog.push(t('commands/dungeon:battle_defend'));
      } else if (turn.customId === 'skl' && playerSkill) {
        const cdLeft = getSkillCooldown(player, playerSkill.id);
        if (cdLeft > 0) {
          battleLog.push(`⏳ ${playerSkill.name} cooldown ${cdLeft} turn lagi!`);
        } else if (player.stamina < playerSkill.staminaCost) {
          battleLog.push(
            t('common:error.low_stamina', {
              current: player.stamina,
              need: playerSkill.staminaCost,
            }),
          );
        } else {
          const ctx: SkillContext = {
            user: player,
            stats,
            enemy: { hp: monsterHp, def: monsterDef },
            t,
            addBuff: (type, value, durationTurns) => {
              player.buffs.push({
                type: type as any,
                value,
                turnsLeft: durationTurns,
                battle: true,
              });
            },
            addLog: (text) => battleLog.push(text),
          };

          const result = playerSkill.use(ctx);
          monsterHp -= result.damage;
          playerHp = Math.min(stats.maxHp, playerHp + result.heal);
          state.dealt += result.damage;

          // Stamina cost
          player.stamina = Math.max(0, player.stamina - playerSkill.staminaCost);

          // Set cooldown
          setSkillCooldown(player, playerSkill);

          // Recalc stats kalo ada buff baru
          stats = await getPlayerStats(player);
        }
      }
    }

    await updateBattle(false);
    await sleep(700);
    if (monsterHp <= 0) break;

    // Monster turn
    await updateBattle(false);
    let monsterDamage = Math.max(1, Math.floor(Math.random() * 5) + monsterAtk - stats.def);
    if (isDefending) monsterDamage = Math.floor(monsterDamage * 0.4);

    playerHp -= monsterDamage;
    state.taken += monsterDamage;
    isDefending = false;

    battleLog.push(t('commands/dungeon:monster_hit', { monsterName, monsterDamage }));
    await updateBattle(false);
    await sleep(800);

    // Akhir turn: kurangin cooldown + buff duration
    tickSkillCooldowns(player);
    tickBuffs(player);

    stats = await getPlayerStats(player); // refresh stats kalo buff abis
    playerHp = Math.min(playerHp, stats.maxHp); // clamp HP kalo maxHp turun
  }

  player.hp = Math.max(0, playerHp);
  await player.updateOne({
    $set: {
      hp: player.hp,
      stamina: player.stamina,
      buffs: player.buffs,
      skillCooldowns: player.skillCooldowns,
    },
  });
  return { victory: monsterHp <= 0, playerHp, monsterHp };
}
