import { Message, ComponentType } from 'discord.js';
import { IUser } from '@nova/db';
import { sleep } from '../../utils';
import { getAtkBuff } from '../buffs';
import { RunState } from './dungeon-state';
import { buildBattleEmbed, getBattleButtons } from './dungeon-ui';
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

  // Hitung stat monster
  const baseHp = 50 + floor * 8;
  const baseAtk = 8 + floor * 1.5;
  const monsterMaxHp = Math.floor(
    isBoss ? baseHp * 3.5 : isElite ? baseHp * 1.8 : baseHp * (0.8 + Math.random() * 0.4),
  );
  const monsterAtk = Math.floor(isBoss ? baseAtk * 2.2 : baseAtk);

  let monsterHp = monsterMaxHp;
  let playerHp = player.hp;
  const attackBuff = getAtkBuff(player);
  const critChance = player.class === 'rogue' ? 0.18 : 0.1;

  let skillCooldown = 0;
  let isDefending = false;
  const skillName =
    player.class === 'rogue' ? 'Backstab' : player.class === 'warrior' ? 'Shield Bash' : 'Fireball';

  // Battle log
  const battleLog: string[] = [];
  battleLog.push(
    t('commands/dungeon:battle_spawn', {
      emoji: monster.emoji,
      name: monster.name,
      elite: isElite ? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
      defaultValue: `**${monster.emoji} ${monster.name}** appeared!${isElite ? ' **ELITE!**' : ''}`,
    }),
  );

  // Helper untuk update embed battle
  const updateBattle = async (showButtons = true) => {
    const embed = buildBattleEmbed({
      monsterName: monster.name,
      monsterEmoji: monster.emoji,
      monsterHp,
      monsterMaxHp,
      playerName: username,
      playerHp,
      playerMaxHp: player.maxHp,
      lore,
      action: battleLog.slice(-5).join('\n'),
      isBoss,
      isElite,
      skillCd: skillCooldown,
      t,
    });
    const components = showButtons ? [getBattleButtons(skillName, skillCooldown, t)] : [];
    await msg.edit({ embeds: [embed], components });
  };

  await updateBattle(true);
  await sleep(600);

  // Loop turn-based
  while (monsterHp > 0 && playerHp > 0) {
    // --- GILIRAN PLAYER ---
    await updateBattle(true);

    const turn = await msg
      .awaitMessageComponent({
        filter: (i) => i.user.id === player.discordId && ['atk', 'def', 'skl'].includes(i.customId),
        time: 30_000,
        componentType: ComponentType.Button,
      })
      .catch(() => null);

    if (!turn) {
      // Timeout = auto attack
      await updateBattle(false);
      const damage =
        Math.floor(Math.random() * 6) + Math.floor(player.attack / 2.5) + 8 + attackBuff;
      monsterHp -= damage;
      state.dealt += damage;
      battleLog.push(
        t('commands/dungeon:battle_auto', { damage, defaultValue: `⏱️ Auto! 🗡️ **${damage}**` }),
      );
      await sleep(700);
    } else {
      await turn.deferUpdate();
      await updateBattle(false);

      if (turn.customId === 'atk') {
        let damage =
          Math.floor(Math.random() * 6) + Math.floor(player.attack / 2.5) + 8 + attackBuff;
        const isCrit = Math.random() < critChance;
        if (isCrit) damage = Math.floor(damage * 1.7);
        monsterHp -= damage;
        state.dealt += damage;
        battleLog.push(
          t('commands/dungeon:battle_hit', {
            damage,
            crit: isCrit ? t('commands/dungeon:crit', { defaultValue: ' 💥CRIT!' }) : '',
            defaultValue: `🗡️ You hit **${damage}**${isCrit ? ' 💥CRIT!' : ''}`,
          }),
        );
      } else if (turn.customId === 'def') {
        isDefending = true;
        battleLog.push(
          t('commands/dungeon:battle_defend', { defaultValue: '🛡️ You defend! Damage -60%' }),
        );
      } else if (turn.customId === 'skl' && skillCooldown === 0) {
        skillCooldown = 3;

        if (player.class === 'rogue') {
          let damage = Math.floor(
            (Math.random() * 6 + Math.floor(player.attack / 2.5) + 8 + attackBuff) * 1.6,
          );
          const isCrit = Math.random() < critChance + 0.3;
          if (isCrit) damage = Math.floor(damage * 1.7);
          monsterHp -= damage;
          state.dealt += damage;
          battleLog.push(
            t('commands/dungeon:battle_backstab', {
              damage,
              crit: isCrit ? ' 💥' : '',
              defaultValue: `✨ Backstab! **${damage}**${isCrit ? ' 💥' : ''}`,
            }),
          );
        } else if (player.class === 'warrior') {
          const damage =
            Math.floor(Math.random() * 4) + Math.floor(player.attack / 3) + 6 + attackBuff;
          monsterHp -= damage;
          state.dealt += damage;
          isDefending = true;
          battleLog.push(
            t('commands/dungeon:battle_bash', {
              damage,
              defaultValue: `✨ Shield Bash! **${damage}** & enemy staggered`,
            }),
          );
        } else {
          const heal = Math.floor(player.maxHp * 0.32);
          playerHp = Math.min(player.maxHp, playerHp + heal);
          const damage =
            Math.floor(Math.random() * 5) + Math.floor(player.attack / 2.8) + 7 + attackBuff;
          monsterHp -= damage;
          state.dealt += damage;
          battleLog.push(
            t('commands/dungeon:battle_fireball', {
              damage,
              heal,
              defaultValue: `✨ Fireball **${damage}** + heal +${heal}`,
            }),
          );
        }
      }
    }

    await updateBattle(false);
    await sleep(700);
    if (monsterHp <= 0) break;

    // --- GILIRAN MONSTER ---
    await updateBattle(false);
    let monsterDamage = Math.floor(Math.random() * 5) + monsterAtk;
    if (isDefending) monsterDamage = Math.floor(monsterDamage * 0.4);
    if (player.class === 'warrior' && Math.random() < 0.2)
      monsterDamage = Math.floor(monsterDamage * 0.7);

    playerHp -= monsterDamage;
    state.taken += monsterDamage;
    isDefending = false;

    battleLog.push(
      t('commands/dungeon:battle_enemy', {
        name: monster.name,
        damage: monsterDamage,
        defaultValue: `💢 ${monster.name} strikes **${monsterDamage}**`,
      }),
    );
    await updateBattle(false);
    await sleep(800);

    if (player.class === 'mage' && Math.random() < 0.15) {
      const heal = Math.floor((player.attack + attackBuff) * 0.25);
      playerHp = Math.min(player.maxHp, playerHp + heal);
      battleLog.push(
        t('commands/dungeon:battle_lifesteal', { heal, defaultValue: `✨ Lifesteal +${heal} HP` }),
      );
      await updateBattle(false);
      await sleep(500);
    }

    if (skillCooldown > 0) skillCooldown--;
  }

  player.hp = Math.max(0, playerHp);

  return {
    victory: monsterHp <= 0,
    playerHp,
    monsterHp,
  };
}
