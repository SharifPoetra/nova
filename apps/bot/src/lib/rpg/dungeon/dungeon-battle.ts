import { Message, ComponentType } from 'discord.js';
import { IUser } from '@nova/db';
import { sleep } from '../../utils';
import { RunState } from './dungeon-state';
import { buildBattleEmbed, getBattleButtons } from './dungeon-ui';
import { getPlayerStats, calculateDamage } from '../combat';
import { getSkill, SkillContext } from '../skills';
import type { TFunction } from 'i18next';

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
  const stats = getPlayerStats(player);

  const baseHp = 50 + floor * 8;
  const baseAtk = 8 + floor * 1.5;
  const monsterMaxHp = Math.floor(
    isBoss? baseHp * 3.5 : isElite? baseHp * 1.8 : baseHp * (0.8 + Math.random() * 0.4),
  );
  const monsterAtk = Math.floor(isBoss? baseAtk * 2.2 : baseAtk);
  const monsterDef = Math.floor(floor * 0.5);

  let monsterHp = monsterMaxHp;
  let playerHp = stats.hp;

  const playerSkillId = stats.availableSkills[0]?? null;
  const playerSkill = playerSkillId? getSkill(playerSkillId) : null;
  let skillCooldown = 0;
  let isDefending = false;

  const battleLog: string[] = [];
  battleLog.push(
    t('commands/dungeon:battle_spawn', {
      emoji: monster.emoji,
      name: monster.name,
      elite: isElite? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
      defaultValue: `**${monster.emoji} ${monster.name}** appeared!${isElite? ' **ELITE!**' : ''}`,
    }),
  );

  const updateBattle = async (showButtons = true) => {
    const embed = buildBattleEmbed({
      monsterName: monster.name,
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
      skillCd: skillCooldown,
      t,
    });
    const components = showButtons
    ? [getBattleButtons(playerSkill?.name?? 'Skill', skillCooldown, t)]
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
      battleLog.push(`⏱️ Auto! 🗡️ **${damage}**`);
      await sleep(700);
    } else {
      await turn.deferUpdate();
      await updateBattle(false);

      if (turn.customId === 'atk') {
        const { damage, isCrit } = calculateDamage(stats, { def: monsterDef }, 1.0);
        monsterHp -= damage;
        state.dealt += damage;
        battleLog.push(`🗡️ You hit **${damage}**${isCrit? ' 💥CRIT!' : ''}`);
      } else if (turn.customId === 'def') {
        isDefending = true;
        battleLog.push(`🛡️ You defend! Damage -60%`);
      } else if (turn.customId === 'skl' && skillCooldown === 0 && playerSkill) {
        skillCooldown = Math.ceil(playerSkill.cooldown / 1000);

        const ctx: SkillContext = {
          user: player,
          stats,
          enemy: { hp: monsterHp, def: monsterDef },
          t,
          addBuff: (type, value, duration) => {
            // Push ke player.buffs, nanti getPlayerStats() bakal ke-apply
            player.buffs.push({
              type: type as any,
              value,
              expires: new Date(Date.now() + duration),
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

    battleLog.push(`💢 ${monster.name} strikes **${monsterDamage}**`);
    await updateBattle(false);
    await sleep(800);

    if (skillCooldown > 0) skillCooldown--;
  }

  player.hp = Math.max(0, playerHp);
  return { victory: monsterHp <= 0, playerHp, monsterHp };
}
