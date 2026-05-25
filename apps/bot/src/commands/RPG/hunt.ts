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
import { checkLevelUp, getScaledExp } from '../../lib/rpg/leveling';
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
import { getSkill, SkillContext, type SkillData } from '../../lib/rpg/skills';
import { addItemToInventory } from '../../lib/rpg/inventory';
import { i18nMonster } from '../../lib/i18n/display';
import { getItemDisplay } from '../../lib/rpg/item-registry';

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
    const battleUser = await db.user.findOne({ discordId: interaction.user.id });
    if (!battleUser) return interaction.editReply(t('common:need_start'));
    applyPassiveRegen(battleUser);
    const now = Date.now();
    if (now - (battleUser.lastHunt?.getTime() ?? 0) < 45000) {
      await battleUser.save();
      const s = Math.ceil((45000 - (now - battleUser.lastHunt!.getTime())) / 1000);
      return interaction.editReply(t('common:error.cooldown', { s }));
    }
    if ((battleUser.stamina ?? 0) < ACTION_COST.hunt) {
      await battleUser.save();
      return interaction.editReply(
        t('common:error.low_stamina', { current: battleUser.stamina, need: ACTION_COST.hunt }),
      );
    }
    const initialStats = await getPlayerStats(battleUser);
    if (initialStats.hp < 20) {
      await battleUser.save();
      return interaction.editReply(t('commands/hunt:low_hp', { hp: initialStats.hp }));
    }
    battleUser.stamina -= ACTION_COST.hunt;
    battleUser.lastHunt = new Date();
    resetSkillCooldowns(battleUser);
    const baseMonster = getScaledMonster(battleUser.level ?? 1);
    const isElite = Math.random() < 0.05;
    const monsterName = i18nMonster('hunt', baseMonster.id, t);
    const monster = {
      ...baseMonster,
      name: isElite ? `Elite ${monsterName}` : monsterName,
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
          name: monsterName,
          defaultValue: `💀 **ELITE ${monsterName}** appeared! HP & ATK boosted!`,
        }),
      );
    }
    const playerClass = battleUser.class ?? 'warrior';
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
    let playerStats: PlayerStats = await getPlayerStats(battleUser);
    const playerSkills = playerStats.availableSkills
      .map((id) => getSkill(id))
      .filter(Boolean) as SkillData[];

    const updateBattleEmbed = async (showButtons = true) => {
      playerStats = await getPlayerStats(battleUser);

      const freshSkills = playerStats.availableSkills
        .map((id) => getSkill(id))
        .filter(Boolean) as SkillData[];
      playerSkills.splice(0, playerSkills.length, ...freshSkills);

      const atkBuff = playerStats.activeBuffs.find((b) => b.type === 'atk');
      const buffInfo = atkBuff ? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

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
            value: `${ratioBar(playerStats.hp, playerStats.maxHp)} \`${playerStats.hp}/${playerStats.maxHp}\` • ⚡${battleUser.stamina}/${battleUser.maxStamina ?? 100}`,
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
        );

        for (const skill of playerSkills.slice(0, 4)) {
          const cd = getSkillCooldown(battleUser, skill.id);
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`hunt_skl_${skill.id}`)
              .setLabel(`${skill.name ?? 'Skill'}${cd > 0 ? ` (${cd})` : ''}`)
              .setEmoji(skill.emoji ?? '✨')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(cd > 0 || battleUser.stamina < skill.staminaCost),
          );
        }
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
            i.user.id === battleUser.discordId &&
            (i.customId === 'hunt_atk' || i.customId.startsWith('hunt_skl_')),
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
        } else if (turn.customId.startsWith('hunt_skl_')) {
          const skillId = turn.customId.replace('hunt_skl_', '');
          const playerSkill = getSkill(skillId);
          if (!playerSkill) {
            await updateBattleEmbed(false);
            continue;
          }

          const cdLeft = getSkillCooldown(battleUser, playerSkill.id);
          if (cdLeft > 0) {
            battleLog.push(`⏳ ${playerSkill.name} cooldown ${cdLeft} turn lagi!`);
          } else if (battleUser.stamina < playerSkill.staminaCost) {
            battleLog.push(`😩 Stamina kurang! Butuh ${playerSkill.staminaCost} ⚡`);
          } else {
            const ctx: SkillContext = {
              user: battleUser,
              stats: playerStats,
              enemy: { hp: monsterCurrentHp, def: Math.floor(monster.level * 0.5) },
              t,
              addBuff: (type, value, durationTurns) => {
                battleUser.buffs.push({
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
            battleUser.hp = Math.min(playerStats.maxHp, battleUser.hp + result.heal);
            totalDamageDealt += result.damage;
            battleUser.stamina = Math.max(0, battleUser.stamina - playerSkill.staminaCost);
            setSkillCooldown(battleUser, playerSkill);
            battleUser.markModified('skillCooldowns');
            playerStats = await getPlayerStats(battleUser);
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
      battleUser.hp = Math.max(0, battleUser.hp - monsterDamage);
      totalDamageTaken += monsterDamage;
      battleLog.push(
        t('commands/hunt:monster_hit', {
          emoji: monster.emoji,
          dmg: monsterDamage,
          block: blockedDamage ? t('commands/hunt:block_suffix', { blocked: blockedDamage }) : '',
        }),
      );
      battleUser.hp = Math.min(battleUser.hp, playerStats.maxHp);
      tickBuffs(battleUser);
      tickSkillCooldowns(battleUser);
      await updateBattleEmbed(false);
      await sleep(850);
    }
    const battleSummary = battleLog.slice(-15).join('\n');
    if (battleUser.hp <= 0) {
      const loseExp = Math.floor(getScaledExp(monster.xp, battleUser.level, 'hunt') / 3);
      battleUser.exp += loseExp;
      battleUser.markModified('skillCooldowns');
      battleUser.markModified('buffs');
      await battleUser.save();
      const finalStats = await getPlayerStats(battleUser);
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
            exp: loseExp,
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

    await addItemToInventory(
      battleUser.discordId,
      {
        itemId: selectedDrop.id,
        emoji: selectedDrop.emoji,
        type: selectedDrop.type as any,
        rarity: selectedDrop.rarity,
        sellPrice: selectedDrop.sellPrice,
        slot: selectedDrop.slot,
        stats: selectedDrop.stats,
        effects: selectedDrop.effects,
      },
      1,
    );

    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return;
    user.hp = battleUser.hp;
    user.stamina = battleUser.stamina;
    user.lastHunt = battleUser.lastHunt;
    user.lastPassive = battleUser.lastPassive;
    user.buffs = battleUser.buffs;
    user.markModified('buffs');

    const expGain = getScaledExp(monster.xp, user.level, 'hunt', monster.isElite);
    user.balance += expGain * 2;
    user.exp += expGain;
    let levelUpText = '';
    const levelUp = checkLevelUp(user);
    if (levelUp) {
      const newStats = await getPlayerStats(user);
      user.hp = newStats.maxHp;
      user.stamina = user.maxStamina;
      levelUpText = t('common:levelup', {
        level: user.level,
        defaultValue: `🎉 LEVEL UP → ${levelUp.level}!`,
      });
    }
    resetSkillCooldowns(user);
    user.buffs = user.buffs.filter((b) => !b.battle);
    user.markModified('skillCooldowns');
    user.markModified('buffs');
    await user.save();
    const finalPlayerStats = await getPlayerStats(user);
    const finalAtkBuff = finalPlayerStats.activeBuffs.find((b) => b.type === 'atk');
    const finalBuffInfo = finalAtkBuff ? ` • 🔥 ATK +${Math.floor(finalAtkBuff.value * 100)}%` : '';
    const dropName = (await getItemDisplay(selectedDrop.id, t))?.name ?? selectedDrop.id;
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
          dropName,
          rarityEmoji: RARITY_EMOJI[selectedDrop.rarity as keyof typeof RARITY_EMOJI],
          rarity: selectedDrop.rarity,
          summary: battleSummary,
          dealt: totalDamageDealt,
          taken: totalDamageTaken,
        }),
      )
      .setFields(
        { name: t('commands/hunt:field_coin'), value: `+${expGain * 2}`, inline: true },
        { name: t('commands/hunt:field_exp'), value: `+${expGain}`, inline: true },
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
