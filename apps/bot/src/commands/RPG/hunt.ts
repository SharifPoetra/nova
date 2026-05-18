import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { sleep, ratioBar, RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { getScaledMonster } from '../../lib/rpg/monsters';
import { ACTION_COST } from '../../lib/rpg/actions';
import {
  getPlayerStats,
  calculateDamage,
  getSkillCooldown,
  setSkillCooldown,
  resetSkillCooldowns,
  tickBuffs,
  tickSkillCooldowns,
  type PlayerStats,
} from '../../lib/rpg/combat';
import { getSkill, SkillContext } from '../../lib/rpg/skills';

@ApplyOptions({ name: 'hunt', description: 'Hunt monsters', fullCategory: ['RPG'] })
export class HuntCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:hunt', 'commands/descriptions:hunt'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const t = await fetchT(interaction);
    const db = this.container.db;
    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply(t('common:need_start'));

    applyPassiveRegen(user);
    const now = Date.now();

    if (now - (user.lastHunt?.getTime() ?? 0) < 45000) {
      await user.save();
      const s = Math.ceil((45000 - (now - user.lastHunt!.getTime())) / 1000);
      return interaction.editReply(t('commands/hunt:cooldown', { s }));
    }

    if ((user.stamina ?? 0) < ACTION_COST.hunt) {
      await user.save();
      return interaction.editReply(
        t('commands/hunt:low_stamina', { current: user.stamina, need: ACTION_COST.hunt }),
      );
    }

    const initialStats = await getPlayerStats(user);
    if (initialStats.hp < 20) {
      await user.save();
      return interaction.editReply(t('commands/hunt:low_hp', { hp: initialStats.hp }));
    }

    user.stamina -= ACTION_COST.hunt;
    user.lastHunt = new Date();
    resetSkillCooldowns(user);

    const baseMonster = getScaledMonster(user.level ?? 1);
    const isElite = Math.random() < 0.05;
    const monster = {
      ...baseMonster,
      name: isElite ? `Elite ${baseMonster.name}` : baseMonster.name,
      emoji: isElite ? `💀${baseMonster.emoji}` : baseMonster.emoji,
      hp: isElite ? Math.floor(baseMonster.hp * 1.8) : baseMonster.hp,
      dmg: isElite
        ? ([Math.floor(baseMonster.dmg[0] * 1.5), Math.floor(baseMonster.dmg[1] * 1.5)] as [
            number,
            number,
          ])
        : baseMonster.dmg,
      xp: isElite ? Math.floor(baseMonster.xp * 2.5) : baseMonster.xp,
      isElite,
    };

    let monsterCurrentHp = monster.hp;
    const monsterMaxHp = monster.hp;
    let totalDamageDealt = 0;
    let totalDamageTaken = 0;
    const battleLog: string[] = [];

    if (isElite) {
      battleLog.push(
        t('commands/hunt:elite_spawn', {
          emoji: monster.emoji,
          name: baseMonster.name,
          defaultValue: `💀 **ELITE ${baseMonster.name}** appeared! HP & ATK boosted!`,
        }),
      );
    }

    const playerClass = user.class ?? 'warrior';
    const isWarrior = playerClass === 'warrior';
    const isMage = playerClass === 'mage';
    const classIcon = isWarrior ? '🛡️' : isMage ? '🪄' : '🏹';

    const embed = new EmbedBuilder()
      .setColor(isElite ? 0x8e44ad : 0xe67e22)
      .setAuthor({
        name: t('commands/hunt:author', { user: interaction.user.username }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(
        t('commands/hunt:found_title', {
          emoji: monster.emoji,
          name: monster.name,
          elite: isElite ? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
        }),
      );

    let playerStats: PlayerStats = await getPlayerStats(user);

    const updateBattleEmbed = async (showButtons = true) => {
      playerStats = await getPlayerStats(user);
      const atkBuff = playerStats.activeBuffs.find((b) => b.type === 'atk');
      const buffInfo = atkBuff ? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';
      const playerSkillId = playerStats.availableSkills[0] ?? null;
      const playerSkill = playerSkillId ? getSkill(playerSkillId) : null;
      const skillCooldown = playerSkill ? getSkillCooldown(user, playerSkill.id) : 0;

      embed
        .setDescription(
          battleLog.slice(-4).join('\n') ||
            t('commands/hunt:battle_start', {
              buff: buffInfo,
              icon: classIcon,
              class: playerClass,
            }),
        )
        .setFields(
          {
            name: `${monster.emoji} ${monster.name}`,
            value: `${ratioBar(monsterCurrentHp, monsterMaxHp)} \`${monsterCurrentHp}/${monsterMaxHp}\``,
            inline: false,
          },
          {
            name: t('commands/hunt:field_you'),
            value: `${ratioBar(playerStats.hp, playerStats.maxHp)} \`${playerStats.hp}/${playerStats.maxHp}\` • ⚡${user.stamina}/${user.maxStamina ?? 100}`,
            inline: false,
          },
        );

      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (showButtons && monsterCurrentHp > 0 && playerStats.hp > 0) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('hunt_atk')
            .setLabel(t('commands/dungeon:btn_attack', { defaultValue: 'Attack' }))
            .setEmoji('🗡️')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('hunt_skl')
            .setLabel(
              playerSkill
                ? `${playerSkill.name}${skillCooldown > 0 ? ` (${skillCooldown})` : ''}`
                : 'Skill',
            )
            .setEmoji(playerSkill?.emoji ?? '✨')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(
              !playerSkill || skillCooldown > 0 || user.stamina < (playerSkill?.staminaCost ?? 999),
            ),
        );
        components.push(row);
      }
      await interaction.editReply({ embeds: [embed], components });
    };

    await updateBattleEmbed(true);
    await sleep(1000);

    while (monsterCurrentHp > 0 && playerStats.hp > 0) {
      await updateBattleEmbed(true);
      const turn = await interaction.channel
        ?.awaitMessageComponent({
          filter: (i) =>
            i.user.id === user.discordId && ['hunt_atk', 'hunt_skl'].includes(i.customId),
          time: 30_000,
          componentType: ComponentType.Button,
        })
        .catch(() => null);

      if (!turn) {
        const { damage, isCrit } = calculateDamage(
          playerStats,
          { def: Math.floor(monster.level * 0.5) },
          1.0,
        );
        monsterCurrentHp = Math.max(0, monsterCurrentHp - damage);
        totalDamageDealt += damage;
        battleLog.push(`⏱️ Auto! 🗡️ **${damage}**${isCrit ? ' 💥CRIT!' : ''}`);
        await updateBattleEmbed(false);
        await sleep(850);
      } else {
        await turn.deferUpdate();
        if (turn.customId === 'hunt_atk') {
          const { damage, isCrit } = calculateDamage(
            playerStats,
            { def: Math.floor(monster.level * 0.5) },
            1.0,
          );
          monsterCurrentHp = Math.max(0, monsterCurrentHp - damage);
          totalDamageDealt += damage;
          battleLog.push(`🗡️ You hit **${damage}**${isCrit ? ' 💥CRIT!' : ''}`);
        } else if (turn.customId === 'hunt_skl' && getSkill(playerStats.availableSkills[0])) {
          const playerSkill = getSkill(playerStats.availableSkills[0])!;
          const cdLeft = getSkillCooldown(user, playerSkill.id);
          if (cdLeft > 0) {
            battleLog.push(`⏳ ${playerSkill.name} cooldown ${cdLeft} turn lagi!`);
          } else if (user.stamina < playerSkill.staminaCost) {
            battleLog.push(`😩 Stamina kurang! Butuh ${playerSkill.staminaCost} ⚡`);
          } else {
            const ctx: SkillContext = {
              user,
              stats: playerStats,
              enemy: { hp: monsterCurrentHp, def: Math.floor(monster.level * 0.5) },
              t,
              addBuff: (type, value, durationTurns) => {
                user.buffs.push({
                  type: type as any,
                  value,
                  turnsLeft: durationTurns,
                  battle: true,
                });
              },
              addLog: (text) => battleLog.push(text),
            };
            const result = playerSkill.use(ctx);
            monsterCurrentHp = Math.max(0, monsterCurrentHp - result.damage);
            user.hp = Math.min(playerStats.maxHp, user.hp + result.heal);
            totalDamageDealt += result.damage;
            user.stamina = Math.max(0, user.stamina - playerSkill.staminaCost);
            setSkillCooldown(user, playerSkill);
          }
        }
        await updateBattleEmbed(false);
        await sleep(700);
      }

      if (monsterCurrentHp <= 0) break;

      let monsterDamage =
        Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0] + 1)) + monster.dmg[0];
      let blockedDamage = 0;
      if (isWarrior && Math.random() < 0.2) {
        blockedDamage = Math.floor(monsterDamage * 0.3);
        monsterDamage -= blockedDamage;
      }
      monsterDamage = Math.max(1, monsterDamage - playerStats.def);
      user.hp = Math.max(0, user.hp - monsterDamage);
      totalDamageTaken += monsterDamage;
      battleLog.push(
        t('commands/hunt:monster_hit', {
          emoji: monster.emoji,
          dmg: monsterDamage,
          block: blockedDamage ? t('commands/hunt:block_suffix', { blocked: blockedDamage }) : '',
        }),
      );
      user.hp = Math.min(user.hp, playerStats.maxHp);
      tickBuffs(user);
      tickSkillCooldowns(user);
      await updateBattleEmbed(false);
      await sleep(850);
    }

    const battleSummary = battleLog.slice(-7).join('\n');

    if (user.hp <= 0) {
      user.exp = (user.exp ?? 0) + Math.floor(monster.xp / 3);
      await user.save();
      const finalStats = await getPlayerStats(user);
      const atkBuff = finalStats.activeBuffs.find((b) => b.type === 'atk');
      const finalBuffInfo = atkBuff ? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';
      embed
        .setColor(0xe74c3c)
        .setTitle(t('commands/hunt:lose_title', { name: monster.name }))
        .setDescription(
          t('commands/hunt:lose_desc', {
            emoji: monster.emoji,
            name: monster.name,
            buff: finalBuffInfo,
            summary: battleSummary,
            dealt: totalDamageDealt,
            taken: totalDamageTaken,
            exp: Math.floor(monster.xp / 3),
          }),
        )
        .setFields();
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    const dropRoll = Math.random() * 100;
    let cumulativeChance = 0;
    let selectedDrop = monster.drops.find((d) => {
      const chance = d.type === 'equipment' && monster.isElite ? d.chance * 5 : d.chance;
      cumulativeChance += chance;
      return dropRoll <= cumulativeChance;
    });
    if (!selectedDrop) selectedDrop = monster.drops[0];

    const inventoryItem = user.items.find((i) => i.itemId === selectedDrop.id);
    if (inventoryItem) inventoryItem.qty += 1;
    else user.items.push({ itemId: selectedDrop.id, qty: 1 });

    user.balance += monster.xp * 2;
    user.exp = (user.exp ?? 0) + monster.xp;

    await db.item.updateOne(
      { itemId: selectedDrop.id },
      {
        $set: {
          name: selectedDrop.name,
          emoji: selectedDrop.emoji,
          type: selectedDrop.type,
          rarity: selectedDrop.rarity,
          sellPrice: selectedDrop.sellPrice,
          description: selectedDrop.description,
          slot: selectedDrop.slot ?? null,
          stats: selectedDrop.stats ?? null,
          effects: selectedDrop.effects ?? null,
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const levelUpResult = checkLevelUp(user);
    if (levelUpResult) {
      Object.assign(user, levelUpResult);
      levelUpText = t('commands/hunt:levelup', { level: levelUpResult.level });
    }

    resetSkillCooldowns(user);
    user.buffs = user.buffs.filter((b) => !b.battle);
    await user.save();

    const finalPlayerStats = await getPlayerStats(user);
    const finalAtkBuff = finalPlayerStats.activeBuffs.find((b) => b.type === 'atk');
    const finalBuffInfo = finalAtkBuff ? ` • 🔥 ATK +${Math.floor(finalAtkBuff.value * 100)}%` : '';

    embed
      .setColor(RARITY_COLOR[selectedDrop.rarity as keyof typeof RARITY_COLOR])
      .setTitle(
        t('commands/hunt:win_title', { name: monster.name, elite: isElite ? ' **ELITE!**' : '' }),
      )
      .setDescription(
        t('commands/hunt:win_desc', {
          emoji: monster.emoji,
          name: monster.name,
          buff: finalBuffInfo,
          levelup: levelUpText,
          dropEmoji: selectedDrop.emoji,
          dropName: selectedDrop.name,
          rarityEmoji: RARITY_EMOJI[selectedDrop.rarity as keyof typeof RARITY_EMOJI],
          rarity: selectedDrop.rarity,
          summary: battleSummary,
          dealt: totalDamageDealt,
          taken: totalDamageTaken,
        }),
      )
      .setFields(
        { name: t('commands/hunt:field_coin'), value: `+${monster.xp * 2}`, inline: true },
        { name: t('commands/hunt:field_exp'), value: `+${monster.xp}`, inline: true },
        {
          name: t('commands/hunt:field_hp'),
          value: `${finalPlayerStats.hp}/${finalPlayerStats.maxHp}`,
          inline: true,
        },
        {
          name: t('commands/hunt:field_stamina'),
          value: `${user.stamina}/${user.maxStamina ?? 100}`,
          inline: true,
        },
      );

    await interaction.editReply({ embeds: [embed], components: [] });
  }
}
