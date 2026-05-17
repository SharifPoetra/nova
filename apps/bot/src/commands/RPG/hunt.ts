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
} from '../../lib/rpg/combat';
import { getSkill, SkillContext } from '../../lib/rpg/skills';

@ApplyOptions<Command.Options>({
  name: 'hunt',
  description: 'Hunt monsters',
  fullCategory: ['RPG'],
})
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

    // === FIX: Typo ) di sini ===
    if (now - (user.lastHunt?.getTime()?? 0) < 45000) {
      await user.save();
      const s = Math.ceil((45000 - (now - user.lastHunt!.getTime())) / 1000);
      return interaction.editReply(t('commands/hunt:cooldown', { s }));
    }

    if ((user.stamina?? 0) < ACTION_COST.hunt) {
      await user.save();
      return interaction.editReply(
        t('commands/hunt:low_stamina', { current: user.stamina, need: ACTION_COST.hunt }),
      );
    }

    if ((user.hp?? 0) < 20) {
      await user.save();
      return interaction.editReply(t('commands/hunt:low_hp', { hp: user.hp }));
    }

    user.stamina -= ACTION_COST.hunt;
    user.lastHunt = new Date();

    resetSkillCooldowns(user);

    const baseMonster = getScaledMonster(user.level?? 1);

    const isElite = Math.random() < 0.05;
    const monster = {
    ...baseMonster,
      name: isElite? `Elite ${baseMonster.name}` : baseMonster.name,
      emoji: isElite? `💀${baseMonster.emoji}` : baseMonster.emoji,
      hp: isElite? Math.floor(baseMonster.hp * 1.8) : baseMonster.hp,
      dmg: isElite
      ? ([Math.floor(baseMonster.dmg[0] * 1.5), Math.floor(baseMonster.dmg[1] * 1.5)] as [
            number,
            number,
          ])
        : baseMonster.dmg,
      xp: isElite? Math.floor(baseMonster.xp * 2.5) : baseMonster.xp,
      isElite,
    };

    let mHp = monster.hp,
      uHp = user.hp;
    const mMax = monster.hp;
    let totalDealt = 0,
      totalTaken = 0;
    const log: string[] = [];

    if (isElite) {
      log.push(
        t('commands/hunt:elite_spawn', {
          emoji: monster.emoji,
          name: baseMonster.name,
          defaultValue: `💀 **ELITE ${baseMonster.name}** appeared! HP & ATK boosted!`,
        }),
      );
    }

    const userClass = user.class?? 'warrior';
    const isWarrior = userClass === 'warrior';
    const isMage = userClass === 'mage';
    const classIcon = isWarrior? '🛡️' : isMage? '🪄' : '🏹';

    const embed = new EmbedBuilder()
    .setColor(isElite? 0x8e44ad : 0xe67e22)
    .setAuthor({
        name: t('commands/hunt:author', { user: interaction.user.username }),
        iconURL: interaction.user.displayAvatarURL(),
      })
    .setTitle(
        t('commands/hunt:found_title', {
          emoji: monster.emoji,
          name: monster.name,
          elite: isElite? t('commands/dungeon:elite_tag', { defaultValue: ' **ELITE!**' }) : '',
        }),
      );

    const updateEmbed = async (showButtons = true) => {
      const stats = getPlayerStats(user);

      // === FIX: Display % langsung, bukan flat ===
      const atkBuff = stats.activeBuffs.find(b => b.type === 'atk');
      const buffInfo = atkBuff? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

      const playerSkillId = stats.availableSkills[0]?? null;
      const playerSkill = playerSkillId? getSkill(playerSkillId) : null;
      const skillCd = playerSkill? getSkillCooldown(user, playerSkill.id) : 0;

      embed
      .setDescription(
          log.slice(-4).join('\n') ||
            t('commands/hunt:battle_start', {
              buff: buffInfo,
              icon: classIcon,
              class: userClass,
            }),
        )
      .setFields(
          {
            name: `${monster.emoji} ${monster.name}`,
            value: `${ratioBar(mHp, mMax)} \`${mHp}/${mMax}\``,
            inline: false,
          },
          {
            name: t('commands/hunt:field_you'),
            value: `${ratioBar(uHp, user.maxHp)} \`${uHp}/${user.maxHp}\` • ⚡${user.stamina}/${user.maxStamina?? 100}`,
            inline: false,
          },
        );

      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (showButtons && mHp > 0 && uHp > 0) {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
          .setCustomId('hunt_atk')
          .setLabel(t('commands/dungeon:btn_attack', { defaultValue: 'Attack' }))
          .setEmoji('🗡️')
          .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
          .setCustomId('hunt_skl')
          .setLabel(
              playerSkill? `${playerSkill.name}${skillCd > 0? ` (${skillCd})` : ''}` : 'Skill',
            )
          .setEmoji(playerSkill?.emoji?? '✨')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(
            !playerSkill || skillCd > 0 || user.stamina < (playerSkill?.staminaCost?? 999),
            ),
        );
        components.push(row);
      }

      await interaction.editReply({ embeds: [embed], components });
      return stats;
    };

    let currentStats = await updateEmbed(true);
    await sleep(1000);

    while (mHp > 0 && uHp > 0) {
      currentStats = getPlayerStats(user);

      await updateEmbed(true);

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
          currentStats,
          { def: Math.floor(monster.level * 0.5) },
          1.0,
        );
        mHp = Math.max(0, mHp - damage);
        totalDealt += damage;
        log.push(`⏱️ Auto! 🗡️ **${damage}**${isCrit? ' 💥CRIT!' : ''}`);
        await updateEmbed(false);
        await sleep(850);
      } else {
        await turn.deferUpdate();

        if (turn.customId === 'hunt_atk') {
          const { damage, isCrit } = calculateDamage(
            currentStats,
            { def: Math.floor(monster.level * 0.5) },
            1.0,
          );
          mHp = Math.max(0, mHp - damage);
          totalDealt += damage;
          log.push(`🗡️ You hit **${damage}**${isCrit? ' 💥CRIT!' : ''}`);
        } else if (turn.customId === 'hunt_skl' && getSkill(currentStats.availableSkills[0])) {
          const playerSkill = getSkill(currentStats.availableSkills[0])!;
          const cdLeft = getSkillCooldown(user, playerSkill.id);
          if (cdLeft > 0) {
            log.push(`⏳ ${playerSkill.name} cooldown ${cdLeft} turn lagi!`);
          } else if (user.stamina < playerSkill.staminaCost) {
            log.push(`😩 Stamina kurang! Butuh ${playerSkill.staminaCost} ⚡`);
          } else {
            const ctx: SkillContext = {
              user,
              stats: currentStats,
              enemy: { hp: mHp, def: Math.floor(monster.level * 0.5) },
              t,
              addBuff: (type, value, durationTurns) => {
                user.buffs.push({
                  type: type as any,
                  value,
                  turnsLeft: durationTurns,
                  battle: true
                });
              },
              addLog: (text) => log.push(text),
            };

            const result = playerSkill.use(ctx);
            mHp = Math.max(0, mHp - result.damage);
            uHp = Math.min(user.maxHp, uHp + result.heal);
            totalDealt += result.damage;

            user.stamina = Math.max(0, user.stamina - playerSkill.staminaCost);
            setSkillCooldown(user, playerSkill);
          }
        }

        await updateEmbed(false);
        await sleep(700);
      }
      
      if (mHp <= 0) break;

      let mDmg = Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
      let blocked = 0;
      if (isWarrior && Math.random() < 0.2) {
        blocked = Math.floor(mDmg * 0.3);
        mDmg -= blocked;
      }
      mDmg = Math.max(1, mDmg - currentStats.def);
      uHp = Math.max(0, uHp - mDmg);
      totalTaken += mDmg;

      log.push(
        t('commands/hunt:monster_hit', {
          emoji: monster.emoji,
          dmg: mDmg,
          block: blocked? t('commands/hunt:block_suffix', { blocked }) : '',
        }),
      );

      uHp = Math.min(uHp, user.maxHp);
      
      tickBuffs(user);
      tickSkillCooldowns(user);

      await updateEmbed(false);
      await sleep(850);
    }

    user.hp = uHp;
    const summary = log.slice(-7).join('\n');

    if (uHp <= 0) {
      user.exp = (user.exp?? 0) + Math.floor(monster.xp / 3);
      await user.save();

      const finalStats = getPlayerStats(user);
      const atkBuff = finalStats.activeBuffs.find(b => b.type === 'atk');
      const finalBuffInfo = atkBuff? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

      embed
      .setColor(0xe74c3c)
      .setTitle(t('commands/hunt:lose_title', { name: monster.name }))
      .setDescription(
          t('commands/hunt:lose_desc', {
            emoji: monster.emoji,
            name: monster.name,
            buff: finalBuffInfo,
            summary,
            dealt: totalDealt,
            taken: totalTaken,
            exp: Math.floor(monster.xp / 3),
          }),
        )
      .setFields();
      return interaction.editReply({ embeds: [embed], components: [] });
    }

    const roll = Math.random() * 100;
    let cum = 0;
    let drop = monster.drops.find((d) => {
      const chance = d.type === 'equipment' && monster.isElite? d.chance * 5 : d.chance;
      cum += chance;
      return roll <= cum;
    });

    if (!drop) drop = monster.drops[0];

    const inv = user.items.find((i) => i.itemId === drop.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: drop.id, qty: 1 });

    user.balance += monster.xp * 2;
    user.exp = (user.exp?? 0) + monster.xp;

    await db.item.updateOne(
      { itemId: drop.id },
      {
        $set: {
          name: drop.name,
          emoji: drop.emoji,
          type: drop.type,
          rarity: drop.rarity,
          sellPrice: drop.sellPrice,
          description: drop.description,
        ...(drop.stats && { stats: drop.stats }),
        ...(drop.classLock && { classLock: drop.classLock }),
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const lvl = checkLevelUp(user);
    if (lvl) {
      Object.assign(user, lvl);
      levelUpText = t('commands/hunt:levelup', { level: lvl.level });
    }

    resetSkillCooldowns(user);
    user.buffs = user.buffs.filter(b => !b.battle);
    await user.save();

    const finalStats = getPlayerStats(user);
    const atkBuff = finalStats.activeBuffs.find(b => b.type === 'atk');
    const finalBuffInfo = atkBuff? ` • 🔥 ATK +${Math.floor(atkBuff.value * 100)}%` : '';

    embed
    .setColor(RARITY_COLOR[drop.rarity as keyof typeof RARITY_COLOR])
    .setTitle(
        t('commands/hunt:win_title', {
          name: monster.name,
          elite: isElite? ' **ELITE!**' : '',
        }),
      )
    .setDescription(
        t('commands/hunt:win_desc', {
          emoji: monster.emoji,
          name: monster.name,
          buff: finalBuffInfo,
          levelup: levelUpText,
          dropEmoji: drop.emoji,
          dropName: drop.name,
          rarityEmoji: RARITY_EMOJI[drop.rarity as keyof typeof RARITY_EMOJI],
          rarity: drop.rarity,
          summary,
          dealt: totalDealt,
          taken: totalTaken,
        }),
      )
    .setFields(
        { name: t('commands/hunt:field_coin'), value: `+${monster.xp * 2}`, inline: true },
        { name: t('commands/hunt:field_exp'), value: `+${monster.xp}`, inline: true },
        { name: t('commands/hunt:field_hp'), value: `${user.hp}/${user.maxHp}`, inline: true },
        {
          name: t('commands/hunt:field_stamina'),
          value: `${user.stamina}/${user.maxStamina?? 100}`,
          inline: true,
        },
      );

    await interaction.editReply({ embeds: [embed], components: [] });
  }
}
