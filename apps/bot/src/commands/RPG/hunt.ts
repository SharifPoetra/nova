import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { sleep, ratioBar, RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs';
import { getScaledMonster } from '../../lib/rpg/monsters';
import { ACTION_COST } from '../../lib/rpg/actions';

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

    if (!user) return interaction.editReply(t('commands/hunt:need_start'));

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

    if ((user.hp ?? 0) < 20) {
      await user.save();
      return interaction.editReply(t('commands/hunt:low_hp', { hp: user.hp }));
    }

    user.stamina -= ACTION_COST.hunt;
    user.lastHunt = new Date();

    const monster = getScaledMonster(user.level ?? 1);
    let mHp = monster.hp,
      uHp = user.hp;
    const mMax = monster.hp,
      uMax = user.maxHp;
    let totalDealt = 0,
      totalTaken = 0;
    const log: string[] = [];

    const bonusAtk = getAtkBuff(user);
    const buffInfo = bonusAtk ? ` • 🔥 ATK +${bonusAtk}` : '';

    const userClass = user.class ?? 'warrior';
    const isRogue = userClass === 'rogue';
    const isMage = userClass === 'mage';
    const isWarrior = userClass === 'warrior';
    const critChance = isRogue ? 0.18 : 0.1;
    const classIcon = isWarrior ? '🛡️' : isMage ? '🪄' : '🏹';

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setAuthor({
        name: t('commands/hunt:author', { user: interaction.user.username }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(t('commands/hunt:found_title', { emoji: monster.emoji, name: monster.name }))
      .setDescription(
        t('commands/hunt:battle_start', {
          buff: buffInfo,
          icon: classIcon,
          class: userClass,
        }),
      );

    await interaction.editReply({ embeds: [embed] });
    await sleep(1000);

    while (mHp > 0 && uHp > 0) {
      // PLAYER TURN
      const isCrit = Math.random() < critChance;
      let pDmg =
        Math.floor(Math.random() * 15) + 10 + Math.floor((user.attack ?? 10) / 3) + bonusAtk;
      if (isCrit) pDmg = Math.floor(pDmg * 1.8);
      mHp = Math.max(0, mHp - pDmg);
      totalDealt += pDmg;

      let playerLog = t('commands/hunt:player_hit', {
        icon: isCrit ? '💥' : '🗡️',
        crit: isCrit ? t('commands/hunt:player_crit') : '',
        dmg: pDmg,
      });

      if (isMage && Math.random() < 0.15 && uHp < uMax) {
        const heal = Math.floor(pDmg * 0.25);
        uHp = Math.min(uMax, uHp + heal);
        playerLog += t('commands/hunt:mage_heal', { heal });
      }

      log.push(playerLog);

      embed.setDescription(log.slice(-4).join('\n')).setFields(
        {
          name: `${monster.emoji} ${monster.name}`,
          value: `${ratioBar(mHp, mMax)} \`${mHp}/${mMax}\``,
          inline: false,
        },
        {
          name: t('commands/hunt:field_you'),
          value: `${ratioBar(uHp, uMax)} \`${uHp}/${uMax}\``,
          inline: false,
        },
      );
      await interaction.editReply({ embeds: [embed] });
      await sleep(850);
      if (mHp <= 0) break;

      // MONSTER TURN
      let mDmg = Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
      let blocked = 0;
      if (isWarrior && Math.random() < 0.2) {
        blocked = Math.floor(mDmg * 0.3);
        mDmg -= blocked;
      }
      uHp = Math.max(0, uHp - mDmg);
      totalTaken += mDmg;

      log.push(
        t('commands/hunt:monster_hit', {
          emoji: monster.emoji,
          dmg: mDmg,
          block: blocked ? t('commands/hunt:block_suffix', { blocked }) : '',
        }),
      );

      embed.setDescription(log.slice(-4).join('\n')).setFields(
        {
          name: `${monster.emoji} ${monster.name}`,
          value: `${ratioBar(mHp, mMax)} \`${mHp}/${mMax}\``,
          inline: false,
        },
        {
          name: t('commands/hunt:field_you'),
          value: `${ratioBar(uHp, uMax)} \`${uHp}/${uMax}\``,
          inline: false,
        },
      );
      await interaction.editReply({ embeds: [embed] });
      await sleep(850);
    }

    user.hp = uHp;
    const summary = log.slice(-7).join('\n');

    if (uHp <= 0) {
      user.exp = (user.exp ?? 0) + Math.floor(monster.xp / 3);
      await user.save();

      embed
        .setColor(0xe74c3c)
        .setTitle(t('commands/hunt:lose_title', { name: monster.name }))
        .setDescription(
          t('commands/hunt:lose_desc', {
            emoji: monster.emoji,
            name: monster.name,
            buff: buffInfo,
            summary,
            dealt: totalDealt,
            taken: totalTaken,
            exp: Math.floor(monster.xp / 3),
          }),
        )
        .setFields();
      return interaction.editReply({ embeds: [embed] });
    }

    // WIN
    const roll = Math.random() * 100;
    let cum = 0;
    const drop = monster.drops.find((d) => (cum += d.chance) >= roll)!;

    const inv = user.items.find((i) => i.itemId === drop.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: drop.id, qty: 1 });

    user.balance += monster.xp * 2;
    user.exp = (user.exp ?? 0) + monster.xp;

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

    await user.save();

    embed
      .setColor(RARITY_COLOR[drop.rarity as keyof typeof RARITY_COLOR])
      .setTitle(t('commands/hunt:win_title', { name: monster.name }))
      .setDescription(
        t('commands/hunt:win_desc', {
          emoji: monster.emoji,
          name: monster.name,
          buff: buffInfo,
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
          value: `${user.stamina}/${user.maxStamina}`,
          inline: true,
        },
      );

    await interaction.editReply({ embeds: [embed] });
  }
}
