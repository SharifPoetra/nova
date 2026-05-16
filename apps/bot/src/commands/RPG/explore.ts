import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';
import { rollExplore, EXPLORES } from '../../lib/rpg/explorations';
import { ACTION_COST } from '../../lib/rpg/actions';

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Explore the world of Nova and find treasures',
  fullCategory: ['RPG'],
})
export class ExploreCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:explore', 'commands/descriptions:explore'),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const db = this.container.db;

    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user)
      return interaction.editReply(
        t('common:need_start', { defaultValue: '❌ Use `/start` first.' }),
      );

    applyPassiveRegen(user);

    if (user.stamina < ACTION_COST.explore) {
      await user.save();
      return interaction.editReply(
        t('commands/explore:low_stamina', {
          current: user.stamina,
          cost: ACTION_COST.explore,
          defaultValue: `⚡ Not enough stamina (${user.stamina}/${ACTION_COST.explore})`,
        }),
      );
    }

    const now = Date.now();
    const cd = 30_000;
    if (user.lastExplore && now - user.lastExplore.getTime() < cd) {
      const s = Math.ceil((cd - (now - user.lastExplore.getTime())) / 1000);
      await user.save();
      return interaction.editReply(
        t('commands/explore:cooldown', { s, defaultValue: `⏳ Wait ${s}s more.` }),
      );
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
            type: outcome.item.type,
            rarity: outcome.item.rarity,
            sellPrice: outcome.item.sellPrice,
            description: outcome.item.description,
          },
        },
        { upsert: true },
      );
    }

    let levelUpText = '';
    const lvl = checkLevelUp(user);
    if (lvl) {
      Object.assign(user, lvl);
      levelUpText = `\n\n${t('commands/explore:levelup', { level: lvl.level, defaultValue: `🎉 **LEVEL UP → Lv.${lvl.level}**` })}`;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(RARITY_COLOR[outcome.rarity as keyof typeof RARITY_COLOR])
      .setTitle(
        t('commands/explore:title', {
          emoji: outcome.emoji,
          defaultValue: `${outcome.emoji} Exploration`,
        }),
      )
      .setDescription(
        `*${outcome.text}*\n\n` +
          `> **${t('commands/explore:coins', { coins: outcome.coins, defaultValue: `+${outcome.coins} coins` })}**\n` +
          `> **${t('commands/explore:exp', { exp: outcome.exp, defaultValue: `+${outcome.exp} EXP` })}**` +
          (outcome.item
            ? `\n> **${t('commands/explore:item', { qty: outcome.item.qty, emoji: outcome.item.emoji, name: outcome.item.name, defaultValue: `+${outcome.item.qty}x ${outcome.item.emoji} ${outcome.item.name}` })}** ${RARITY_EMOJI[outcome.item.rarity as keyof typeof RARITY_EMOJI]}`
            : '') +
          levelUpText,
      )
      .setFooter({
        text: t('commands/explore:footer', {
          cost: ACTION_COST.explore,
          current: user.stamina,
          max: user.maxStamina,
          defaultValue: `Stamina -${ACTION_COST.explore} • ${user.stamina}/${user.maxStamina}`,
        }),
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
