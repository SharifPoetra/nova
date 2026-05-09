import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs';
import { getScaledMonster } from '../../lib/rpg/monsters';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const bar = (cur: number, max: number) => {
  const p = Math.max(0, Math.min(1, cur / max));
  const f = Math.round(p * 10);
  return '▰'.repeat(f) + '▱'.repeat(10 - f);
};

const colorByRarity = {
  Common: 0x95a5a6,
  Uncommon: 0x2ecc71,
  Rare: 0x3498db,
  Epic: 0x9b59b6,
  Legendary: 0xf1c40f,
};

@ApplyOptions<Command.Options>({
  name: 'hunt',
  description: 'Berburu monster (cost 20 stamina)',
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
    if ((user.stamina ?? 0) < 20) {
      await user.save();
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/20)`);
    }
    if ((user.hp ?? 0) < 20) {
      await user.save();
      return interaction.editReply(`❤️ HP rendah (${user.hp}). /cook dulu!`);
    }
    user.stamina -= 20;
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

    const embed = new EmbedBuilder()
      .setColor(0xe67e22)
      .setAuthor({
        name: `${interaction.user.username} berburu`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTitle(`Menemukan ${monster.emoji} ${monster.name}!`)
      .setDescription(`⚔️ Pertarungan dimulai...${buffInfo}`);
    await interaction.editReply({ embeds: [embed] });
    await sleep(1000);

    while (mHp > 0 && uHp > 0) {
      const isCrit = Math.random() < 0.1;
      let pDmg =
        Math.floor(Math.random() * 15) + 10 + Math.floor((user.attack ?? 10) / 3) + bonusAtk;
      if (isCrit) pDmg = Math.floor(pDmg * 1.8);
      mHp = Math.max(0, mHp - pDmg);
      totalDealt += pDmg;
      log.push(
        `${isCrit ? '💥' : '🗡️'} Kamu ${isCrit ? 'CRIT ' : ''}**${pDmg}**${bonusAtk ? ` [${user.attack}+${bonusAtk}]` : ''}`,
      );

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

      const mDmg = Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
      uHp = Math.max(0, uHp - mDmg);
      totalTaken += mDmg;
      log.push(`${monster.emoji} balas **${mDmg}**`);

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
        .setTitle(`💀 Kalah`)
        .setDescription(
          `Tumbang lawan ${monster.emoji} **${monster.name}**${buffInfo}\n\n**📜 Pertarungan:**\n${summary}\n\n**📊 Damage:** Dealt ${totalDealt} | Taken ${totalTaken}\n\n> +${Math.floor(monster.xp / 3)} EXP`,
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
      user.level = lvl.level;
      user.exp = lvl.expLeft;
      user.maxHp = lvl.maxHp;
      user.hp = lvl.hp;
      user.attack = lvl.attack;
      user.maxStamina = lvl.maxStamina;
      user.stamina = lvl.stamina;
      levelUpText = `\n\n🎉 **LEVEL UP → Lv.${lvl.level}**`;
    }

    await user.save();

    embed
      .setColor(colorByRarity[drop.rarity as keyof typeof colorByRarity])
      .setTitle(`✅ Menang!`)
      .setDescription(
        `Kalahkan ${monster.emoji} **${monster.name}**!${levelUpText}${buffInfo}\n\n**${drop.emoji} ${drop.name}** ×1 • *${drop.rarity}*\n\n**📜 Pertarungan:**\n${summary}\n\n**📊 Damage:** Dealt ${totalDealt} | Taken ${totalTaken}`,
      )
      .setFields(
        { name: '💰', value: `+${monster.xp * 2}`, inline: true },
        { name: '✨ EXP', value: `+${monster.xp}`, inline: true },
        { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
      );
    await interaction.editReply({ embeds: [embed] });
  }
}
