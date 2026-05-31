import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { sleep, ratioBar, RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';
import { checkLevelUp, getScaledExp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { getScaledMonster } from '../../lib/rpg/monsters';
import { ACTION_COST } from '../../lib/rpg/actions';
import { getPlayerStats, resetSkillCooldowns } from '../../lib/rpg/combat';
import { addItemToInventory } from '../../lib/rpg/inventory';
import { i18nMonster } from '../../lib/i18n/display';
import { getItemDisplay } from '../../lib/rpg/item-registry';
import { BattleEngine, type EnemyStats } from '../../lib/rpg/battle-engine';
import { elementTable, ELEMENT_EMOJI } from '../../lib/rpg/combat';

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
    // Build EnemyStats for engine
    const elementEmoji = ELEMENT_EMOJI[baseMonster.element];
    const enemy: EnemyStats = {
      id: baseMonster.id,
      name: isElite ? `Elite ${monsterName}` : monsterName,
      emoji: isElite ? `💀${baseMonster.emoji}` : `${elementEmoji}${baseMonster.emoji}`,
      hp: isElite ? Math.floor(baseMonster.hp * 1.8) : baseMonster.hp,
      maxHp: isElite ? Math.floor(baseMonster.hp * 1.8) : baseMonster.hp,
      atk: Math.floor(((baseMonster.dmg[0] + baseMonster.dmg[1]) / 2) * (isElite ? 1.5 : 1)),
      def: Math.floor(baseMonster.level * 0.5),
      isElite,
      critRate: 0.05,
      critDmg: 1.5,
      element: baseMonster.element,
    };
    const engine = new BattleEngine(battleUser, enemy, {
      onLog: () => {},
    });
    await engine.init();
    const playerClass = battleUser.class ?? 'warrior';
    const classIcon = playerClass === 'warrior' ? '🛡️' : playerClass === 'mage' ? '🪄' : '🏹';
    const embed = new EmbedBuilder()
      .setColor(isElite ? 0x8e44ad : 0xe67e22)
      .setAuthor({
        name: t('commands/hunt:author', { user: interaction.user.username }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(
        t('commands/hunt:found_title', {
          emoji: enemy.emoji,
          name: enemy.name,
          elite: isElite ? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
        }),
      );

    const updateBattleEmbed = async (showButtons = true) => {
      const playerStats = engine.playerStats;
      const playerSkills = engine.getPlayerSkills();
      const atkBuff = playerStats.activeBuffs.find((b) => b.type === 'atk');
      const buffInfo = atkBuff ? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

      // Element weakness hint
      const weakTo = Object.entries(elementTable)
        .filter(([, defs]) => (defs as any)[enemy.element!] > 1)
        .map(([e]) => ELEMENT_EMOJI[e as keyof typeof ELEMENT_EMOJI]);
      const elementInfo = `${ELEMENT_EMOJI[enemy.element!]} ${enemy.element!.toUpperCase()}${weakTo.length ? ` → ${weakTo.join('')}` : ''}`;

      embed
        .setDescription(
          engine.log.slice(-4).join('\n') ||
            t('commands/hunt:battle_start', {
              buff: buffInfo,
              icon: classIcon,
              class: playerClass,
            }),
        )
        .setFields(
          {
            name: `${enemy.emoji} ${enemy.name}`,
            value:
              `
              ${ratioBar(engine.enemyHp, enemy.maxHp)} \`${engine.enemyHp}/${enemy.maxHp}\`` +
              `\n**Element:** ${elementInfo}`,
            inline: false,
          },
          {
            name: t('commands/hunt:field_you'),
            value: `${ratioBar(playerStats.hp, playerStats.maxHp)} \`${playerStats.hp}/${playerStats.maxHp}\` • ⚡${battleUser.stamina}/${battleUser.maxStamina ?? 100}`,
            inline: false,
          },
        );
      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (showButtons && engine.enemyHp > 0 && playerStats.hp > 0) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('hunt_atk')
            .setLabel(t('commands/dungeon:btn_attack', { defaultValue: 'Attack' }))
            .setEmoji('🗡️')
            .setStyle(ButtonStyle.Danger),
        );
        for (const skill of playerSkills.slice(0, 4)) {
          const canUse = engine.canUseSkill(skill.id);
          const cd = engine['user'].skillCooldowns.get(skill.id) ?? 0;
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`hunt_skl_${skill.id}`)
              .setLabel(`${skill.name ?? 'Skill'}${cd > 0 ? ` (${cd})` : ''}`)
              .setEmoji(skill.emoji ?? '✨')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(!canUse.ok),
          );
        }
        components.push(row);
      }
      await interaction.editReply({ embeds: [embed], components });
    };

    await updateBattleEmbed(true);
    await sleep(700);
    // Battle loop using engine
    while (!engine.isBattleOver()) {
      await updateBattleEmbed(true);
      const turn = await interaction.channel
        ?.awaitMessageComponent({
          filter: (i) =>
            i.user.id === battleUser.discordId && (i.customId === 'hunt_atk' || i.customId.startsWith('hunt_skl_')),
          time: 30_000,
          componentType: ComponentType.Button,
        })
        .catch(() => null);
      if (!turn) {
        // Auto attack
        await engine.playerAttack('basic');
        await updateBattleEmbed(false);
        await sleep(700);
      } else {
        await turn.deferUpdate();
        if (turn.customId === 'hunt_atk') {
          await engine.playerAttack('basic');
        } else if (turn.customId.startsWith('hunt_skl_')) {
          const skillId = turn.customId.replace('hunt_skl_', '');
          await engine.playerAttack(skillId);
        }
        await updateBattleEmbed(false);
        await sleep(700);
      }
      if (engine.enemyHp <= 0) break;
      // Enemy turn - engine handles dodge/block/crit
      engine.enemyAttack();
      await engine.endTurn();
      await updateBattleEmbed(false);
      await sleep(700);
    }
    const result = engine.getResult();
    const battleSummary = result.log.slice(-15).join('\n');

    if (!result.victory) {
      const loseExp = Math.floor(getScaledExp(baseMonster.xp, battleUser.level, 'hunt') / 3);
      battleUser.exp += loseExp;
      battleUser.markModified('skillCooldowns');
      battleUser.markModified('buffs');
      await battleUser.save();

      const finalStats = await getPlayerStats(battleUser);
      const atkBuff = finalStats.activeBuffs.find((b) => b.type === 'atk');
      const finalBuffInfo = atkBuff ? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

      embed
        .setColor(0xe74c3c)
        .setTitle(t('commands/hunt:lose_title', { name: enemy.name }))
        .setDescription(
          t('commands/hunt:lose_desc', {
            emoji: enemy.emoji,
            name: enemy.name,
            buff: finalBuffInfo,
            summary: battleSummary,
            dealt: result.totalDealt,
            taken: result.totalTaken,
            exp: loseExp,
          }),
        )
        .setFields();
      return interaction.editReply({ embeds: [embed], components: [] });
    }
    // Victory - drops
    const dropRoll = Math.random() * 100;
    let cumulativeChance = 0;
    let selectedDrop = baseMonster.drops.find((d) => {
      const chance = d.type === 'equipment' && isElite ? d.chance * 5 : d.chance;
      cumulativeChance += chance;
      return dropRoll <= cumulativeChance;
    });
    if (!selectedDrop) selectedDrop = baseMonster.drops[0];
    await addItemToInventory(
      battleUser,
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
    await battleUser.save();

    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return;

    user.hp = battleUser.hp;
    user.stamina = battleUser.stamina;
    user.lastHunt = battleUser.lastHunt;
    user.lastPassive = battleUser.lastPassive;
    user.buffs = battleUser.buffs;
    user.markModified('buffs');

    const expGain = getScaledExp(baseMonster.xp, user.level, 'hunt', isElite);
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
      .setTitle(t('commands/hunt:win_title', { name: enemy.name, elite: isElite ? ' **ELITE!**' : '' }))
      .setDescription(
        t('commands/hunt:win_desc', {
          emoji: enemy.emoji,
          name: enemy.name,
          buff: finalBuffInfo,
          levelup: levelUpText,
          dropEmoji: selectedDrop.emoji,
          dropName,
          rarityEmoji: RARITY_EMOJI[selectedDrop.rarity as keyof typeof RARITY_EMOJI],
          rarity: selectedDrop.rarity,
          summary: battleSummary,
          dealt: result.totalDealt,
          taken: result.totalTaken,
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
