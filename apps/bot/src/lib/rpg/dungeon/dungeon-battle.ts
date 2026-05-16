import { Message, ComponentType } from 'discord.js';
import { IUser } from '@nova/db';
import { sleep } from '../../utils';
import { RunState } from './dungeon-state';
import { buildBattleEmbed, getBattleButtons } from './dungeon-ui';
import { getPlayerStats, calculateDamage } from '../combat';
import { getSkill } from '../skills';
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

  // === 2.1: GANTI SEMUA STAT PAKE getPlayerStats() ===
  const stats = getPlayerStats(player);

  // Monster stat tetep, tapi def ikut masuk
  const baseHp = 50 + floor * 8;
  const baseAtk = 8 + floor * 1.5;
  const monsterMaxHp = Math.floor(
    isBoss? baseHp * 3.5 : isElite? baseHp * 1.8 : baseHp * (0.8 + Math.random() * 0.4),
  );
  const monsterAtk = Math.floor(isBoss? baseAtk * 2.2 : baseAtk);
  const monsterDef = Math.floor(floor * 0.5); // DEF monster naik per floor

  let monsterHp = monsterMaxHp;
  let playerHp = stats.hp; // pake stats.hp, bukan player.hp langsung

  // Skill setup: ambil dari stats.availableSkills[0]
  const playerSkillId = stats.availableSkills[0]?? null;
  const playerSkill = playerSkillId? getSkill(playerSkillId) : null;
  let skillCooldown = 0;
  let isDefending = false;

  // Battle log
  const battleLog: string[] = [];
  battleLog.push(
    t('commands/dungeon:battle_spawn', {
      emoji: monster.emoji,
      name: monster.name,
      elite: isElite? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
      defaultValue: `**${monster.emoji} ${monster.name}** appeared!${isElite? ' **ELITE!**' : ''}`,
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
      playerMaxHp: stats.maxHp, // pake stats.maxHp
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
      // === 2.1: PAKE calculateDamage() ===
      const { damage } = calculateDamage(stats, { def: monsterDef }, 1.0);
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
        // === 2.1: PAKE calculateDamage() ===
        const { damage, isCrit } = calculateDamage(stats, { def: monsterDef }, 1.0);
        monsterHp -= damage;
        state.dealt += damage;
        battleLog.push(
          t('commands/dungeon:battle_hit', {
            damage,
            crit: isCrit? t('commands/dungeon:crit', { defaultValue: ' 💥CRIT!' }) : '',
            defaultValue: `🗡️ You hit **${damage}**${isCrit? ' 💥CRIT!' : ''}`,
          }),
        );
      } else if (turn.customId === 'def') {
        isDefending = true;
        battleLog.push(
          t('commands/dungeon:battle_defend', { defaultValue: '🛡️ You defend! Damage -60%' }),
        );
      } else if (turn.customId === 'skl' && skillCooldown === 0 && playerSkill) {
        skillCooldown = Math.ceil(playerSkill.cooldown / 1000); // ms ke turn

        // === 2.2: GENERIC SKILL EXECUTION ===
        let totalDamage = 0;
        let totalHeal = 0;

        for (const effect of playerSkill.effects) {
          if (effect.type === 'damage') {
            // Parse formula '1.5*atk' jadi multiplier
            const mult = parseFloat(effect.value.toString().replace('*atk', ''));
            const { damage, isCrit } = calculateDamage(stats, { def: monsterDef }, mult);
            monsterHp -= damage;
            totalDamage += damage;
            state.dealt += damage;
            battleLog.push(
              `✨ ${playerSkill.emoji} ${playerSkill.name}! **${damage}**${isCrit? ' 💥CRIT!' : ''}`
            );
          } else if (effect.type === 'heal') {
            const heal = Math.floor(stats.maxHp * 0.32); // masih hardcoded, nanti Phase 2.2 dirapihin
            playerHp = Math.min(stats.maxHp, playerHp + heal);
            totalHeal += heal;
            battleLog.push(`✨ ${playerSkill.emoji} Heal +${heal}`);
          } else if (effect.type === 'buff') {
            // Buff 'buff:atk:0.3' bakal dihandle getPlayerStats next battle
            // Untuk sekarang cuma log
            isDefending = true; // Shield Bash effect
            battleLog.push(`✨ ${playerSkill.emoji} ${playerSkill.name}! Buff active`);
          }
        }
      }
    }

    await updateBattle(false);
    await sleep(700);
    if (monsterHp <= 0) break;

    // --- GILIRAN MONSTER ---
    await updateBattle(false);
    // === 2.1: Monster damage juga pake formula ===
    let monsterDamage = Math.floor(Math.random() * 5) + monsterAtk;
    // Apply player DEF dari stats.def
    monsterDamage = Math.max(1, monsterDamage - stats.def);

    if (isDefending) monsterDamage = Math.floor(monsterDamage * 0.4);
    // Hapus: if (player.class === 'warrior' && Math.random() < 0.2)

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

    // Hapus: if (player.class === 'mage' && Math.random() < 0.15) lifesteal
    // Lifesteal bakal jadi skill passive di Phase 5

    if (skillCooldown > 0) skillCooldown--;
  }

  // Update HP player di DB
  player.hp = Math.max(0, playerHp);

  return {
    victory: monsterHp <= 0,
    playerHp,
    monsterHp,
  };
}
