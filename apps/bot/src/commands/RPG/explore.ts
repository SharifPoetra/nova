import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/constants';
import { rollExplore } from '../../lib/rpg/explorations';
import { ACTION_COST } from '../../lib/rpg/actions';

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Jelajahi dunia Nova dan temukan harta karun',
  detailedDescription: {
    usage: '/explore',
    examples: ['/explore'],
    extendedHelp: 'Cooldown 30 detik • cost 15 stamina. Hasil tergantung rarity.',
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
      if (inv) {
        inv.qty += outcome.item.qty;
      } else {
        user.items.push({ itemId: outcome.item.id, qty: outcome.item.qty });
      }

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
      .setFooter({
        text: `Stamina -${ACTION_COST.explore} • ${user.stamina}/${user.maxStamina}`,
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
