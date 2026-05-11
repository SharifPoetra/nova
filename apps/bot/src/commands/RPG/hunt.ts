import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { sleep, bar } from '../../lib/utils';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs';
import { getScaledMonster } from '../../lib/rpg/monsters';
import { ACTION_COST } from '../../lib/rpg/actions';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';

@ApplyOptions<Command.Options>({
  name: 'hunt',
  description: 'Berburu monster (cost 20 stamina)',
  detailedDescription: {
    usage: '/hunt',
    examples: ['/hunt'],
    extendedHelp: `
Cooldown 45 detik • butuh ${ACTION_COST.hunt} stamina dan minimal 20 HP.

**Class passive:**
🛡️ Warrior — 20% chance block 30% damage
🏹 Rogue — 18% crit chance (normal 10%)
🪄 Mage — 15% lifesteal 25% dari damage

Drop tergantung monster dan level kamu. Gunakan /droprate tipe:hunt untuk lihat tabel lengkap.
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class HuntCommand extends Command {
  public override registerApplicationCommands(r: Command.Registry) {
    r.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;
    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    applyPassiveRegen(user);

    const now = Date.now();
    if (now - (user.lastHunt?.getTime() ?? 0) < 45000) {
      await user.save();
      return interaction.editReply(
        `🏹 Tunggu ${Math.ceil((45000 - (now - user.lastHunt!.getTime())) / 1000)}s`,
      );
    }
    if ((user.stamina ?? 0) < ACTION_COST.hunt) {
      await user.save();
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/${ACTION_COST.hunt})`);
    }
    if ((user.hp ?? 0) < 20) {
      await user.save();
      return interaction.editReply(`❤️ HP rendah (${user.hp}). /cook dulu!`);
    }
    user.stamina -= ACTION_COST.hunt;
    user.lastHunt = new Date();

    const monster = getScaledMonster(user.level ?? 1);

    let mHp = monster.hp,
      uHp = user.hp;
    const mMax = monster.hp;
    const uMax = user.maxHp;
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
        name: `${interaction.user.username} berburu`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(`Menemukan ${monster.emoji} ${monster.name}!`)
      .setDescription(`⚔️ Pertarungan dimulai...${buffInfo}\n${classIcon} ${userClass}`);
    await interaction.editReply({ embeds: [embed] });
    await sleep(1000);

    while (mHp > 0 && uHp > 0) {
      // PLAYER
      const isCrit = Math.random() < critChance;
      let pDmg =
        Math.floor(Math.random() * 15) + 10 + Math.floor((user.attack ?? 10) / 3) + bonusAtk;
      if (isCrit) pDmg = Math.floor(pDmg * 1.8);
      mHp = Math.max(0, mHp - pDmg);
      totalDealt += pDmg;

      let playerLog = `${isCrit ? '💥' : '🗡️'} Kamu ${isCrit ? 'CRIT ' : ''}**${pDmg}**`;
      if (isMage && Math.random() < 0.15 && uHp < uMax) {
        const heal = Math.floor(pDmg * 0.25);
        uHp = Math.min(uMax, uHp + heal);
        playerLog += ` +🩸${heal}`;
      }
      log.push(playerLog);

      embed.setDescription(log.slice(-4).join('\n') + buffInfo).setFields(
        {
          name: `${monster.emoji} ${monster.name}`,
          value: `${bar(mHp, mMax)} \`${mHp}/${mMax}\``,
          inline: false,
        },
        { name: `❤️ Kamu`, value: `${bar(uHp, uMax)} \`${uHp}/${uMax}\``, inline: false },
      );
      await interaction.editReply({ embeds: [embed] });
      await sleep(850);
      if (mHp <= 0) break;

      // MONSTER
      let mDmg = Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
      let blocked = 0;
      if (isWarrior && Math.random() < 0.2) {
        blocked = Math.floor(mDmg * 0.3);
        mDmg -= blocked;
      }
      uHp = Math.max(0, uHp - mDmg);
      totalTaken += mDmg;
      log.push(`${monster.emoji} balas **${mDmg}**${blocked ? ` 🛡️-${blocked}` : ''}`);

      embed.setDescription(log.slice(-4).join('\n') + buffInfo).setFields(
        {
          name: `${monster.emoji} ${monster.name}`,
          value: `${bar(mHp, mMax)} \`${mHp}/${mMax}\``,
          inline: false,
        },
        { name: `❤️ Kamu`, value: `${bar(uHp, uMax)} \`${uHp}/${uMax}\``, inline: false },
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
        .setTitle(`💀 Kalah dari ${monster.name}`)
        .setDescription(
          `Tumbang lawan ${monster.emoji} **${monster.name}**${buffInfo}\n\n` +
            `**📜 Pertarungan:**\n${summary}\n\n` +
            `**📊** Dealt ${totalDealt} | Taken ${totalTaken}\n\n` +
            `> +${Math.floor(monster.xp / 3)} EXP`,
        )
        .setFields();
      return interaction.editReply({ embeds: [embed] });
    }

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
          type: 'material',
          rarity: drop.rarity,
          sellPrice: drop.sell,
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const lvl = checkLevelUp(user);
    if (lvl) {
      Object.assign(user, lvl);
      levelUpText = `\n\n🎉 **LEVEL UP → Lv.${lvl.level}**`;
    }

    await user.save();

    embed
      .setColor(RARITY_COLOR[drop.rarity as keyof typeof RARITY_COLOR])
      .setTitle(`✅ Menang lawan ${monster.name}!`)
      .setDescription(
        `${monster.emoji} **${monster.name}** berhasil dikalahkan!${levelUpText}${buffInfo}\n\n` +
          `${drop.emoji} **${drop.name}** ×1 ${RARITY_EMOJI[drop.rarity as keyof typeof RARITY_EMOJI]} *${drop.rarity}*\n\n` +
          `**📜 Pertarungan Terakhir:**\n${summary}\n\n` +
          `**📊 Statistik:** Dealt **${totalDealt}** • Taken **${totalTaken}**`,
      )
      .setFields(
        { name: '💰 Koin', value: `+${monster.xp * 2}`, inline: true },
        { name: '✨ EXP', value: `+${monster.xp}`, inline: true },
        { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
        { name: '⚡ Stamina', value: `${user.stamina}/${user.maxStamina}`, inline: true },
      );
    await interaction.editReply({ embeds: [embed] });
  }
}
