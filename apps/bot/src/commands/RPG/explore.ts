import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/constants';
import { rollExplore, EXPLORES } from '../../lib/rpg/explorations';
import { ACTION_COST } from '../../lib/rpg/actions';

const groupByRarity = <T extends { rarity: string }>(arr: T[]) =>
  arr.reduce(
    (acc, cur) => ((acc[cur.rarity] = acc[cur.rarity] ?? []).push(cur), acc),
    {} as Record<string, T[]>,
  );

const raritySummary = Object.entries(groupByRarity(EXPLORES))
  .map(
    ([r, arr]) =>
      `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r} ${arr.reduce((a, b) => a + b.chance, 0)}%`,
  )
  .join(' • ');

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Jelajahi dunia Nova dan temukan harta karun',
  detailedDescription: {
    usage: '/explore',
    examples: ['/explore'],
    extendedHelp: `
Cooldown 30 detik • cost ${ACTION_COST.explore} stamina.

**Hasil:**
• Koin & EXP acak
• Kadang dapat material untuk /cook (Herb, Chili, Ore, dll)
• 15 outcome unik

**Rarity:** ${raritySummary}

Rata-rata: ~${Math.round(EXPLORES.reduce((a, e) => a + e.coins * (e.chance / 100), 0))}💰 per explore.
Lihat tabel lengkap: /droprate tipe:explore
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class ExploreCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;

    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Gunakan `/start` dulu.');

    applyPassiveRegen(user);

    if (user.stamina < ACTION_COST.explore) {
      await user.save();
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/${ACTION_COST.explore})`);
    }

    const now = Date.now();
    const cd = 30_000;
    if (user.lastExplore && now - user.lastExplore.getTime() < cd) {
      const s = Math.ceil((cd - (now - user.lastExplore.getTime())) / 1000);
      await user.save();
      return interaction.editReply(`⏳ Tunggu ${s}s lagi.`);
    }

    user.stamina -= ACTION_COST.explore;
    user.lastExplore = new Date();

    const outcome = rollExplore();
    user.balance += outcome.coins;
    user.exp += outcome.exp;

    if (outcome.item) {
      const inv = user.items.find((i) => i.itemId === outcome.item!.id);
      if (inv) inv.qty += outcome.item.qty;
      else user.items.push({ itemId: outcome.item.id, qty: outcome.item.qty });

      await db.item.updateOne(
        { itemId: outcome.item.id },
        {
          $set: {
            name: outcome.item.name,
            emoji: outcome.item.emoji,
            type: 'material',
            rarity: outcome.item.rarity,
            sellPrice: outcome.item.sell,
          },
        },
        { upsert: true },
      );
    }

    let levelUpText = '';
    const lvl = checkLevelUp(user);
    if (lvl) {
      Object.assign(user, {
        level: lvl.level,
        exp: lvl.expLeft,
        maxHp: lvl.maxHp,
        hp: lvl.hp,
        attack: lvl.attack,
        maxStamina: lvl.maxStamina,
        stamina: lvl.stamina,
      });
      levelUpText = `\n\n🎉 **LEVEL UP → Lv.${lvl.level}**`;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(RARITY_COLOR[outcome.rarity as keyof typeof RARITY_COLOR])
      .setTitle(`${outcome.emoji} Penjelajahan`)
      .setDescription(
        `*${outcome.text}*\n\n` +
          `> **+${outcome.coins}** koin\n` +
          `> **+${outcome.exp}** EXP` +
          (outcome.item
            ? `\n> **+${outcome.item.qty}x ${outcome.item.emoji} ${outcome.item.name}** ${RARITY_EMOJI[outcome.item.rarity as keyof typeof RARITY_EMOJI]}`
            : '') +
          levelUpText,
      )
      .setFooter({ text: `Stamina -${ACTION_COST.explore} • ${user.stamina}/${user.maxStamina}` });

    return interaction.editReply({ embeds: [embed] });
  }
}
