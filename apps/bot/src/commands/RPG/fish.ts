import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { checkLevelUp, getScaledExp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR } from '../../lib/utils';
import { catchFish } from '../../lib/rpg/fishes';
import { ACTION_COST } from '../../lib/rpg/actions';
import { getPlayerStats } from '../../lib/rpg/combat';
import { addItemToInventory } from '../../lib/rpg/inventory';
import { Item } from '@nova/db';

@ApplyOptions<Command.Options>({
  name: 'fish',
  description: 'Go fishing for fish to sell or cook',
  fullCategory: ['RPG'],
})
export class FishCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:fish', 'commands/descriptions:fish'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user)
      return interaction.editReply(
        t('common:need_start', { defaultValue: '❌ Use /start first.' }),
      );

    applyPassiveRegen(user);
    const now = Date.now();
    const cd = 30_000;
    if (now - (user.lastFish?.getTime() ?? 0) < cd) {
      const wait = Math.ceil((cd - (now - (user.lastFish?.getTime() ?? 0))) / 1000);
      await user.save();
      return interaction.editReply(
        t('common:error.cooldown', { wait, defaultValue: `🎣 Rod is still wet! Wait ${wait}s` }),
      );
    }
    if (user.stamina < ACTION_COST.fish) {
      await user.save();
      return interaction.editReply(
        t('common:error.low_stamina', {
          current: user.stamina,
          cost: ACTION_COST.fish,
          defaultValue: `⚡ Not enough stamina (${user.stamina}/${ACTION_COST.fish})`,
        }),
      );
    }

    const toolId = user.equipped?.tool ?? null;
    let fishBonus = 0;
    let rodName = t('commands/fish:no_rod', { defaultValue: 'Bare Hands' });

    if (toolId) {
      const rod = await Item.findOne({ itemId: toolId }).lean();
      if (rod?.stats?.fishBonus) {
        fishBonus = rod.stats.fishBonus; // 0.1 - 0.5
        rodName = `${rod.emoji} ${rod.name}`;
      }
    }

    const fish = catchFish(fishBonus);

    user.stamina -= ACTION_COST.fish;
    user.lastFish = new Date();
    const expGain = getScaledExp(fish.xp, user.level, 'fish');
    user.exp += expGain;

    await addItemToInventory(
      user.discordId,
      {
        itemId: fish.id,
        name: fish.name,
        emoji: fish.emoji,
        type: fish.type,
        rarity: fish.rarity,
        sellPrice: fish.sellPrice,
        description: fish.description,
      },
      1,
    );

    let levelUpText = '';
    const levelUp = checkLevelUp(user);
    if (levelUp) {
      const stats = await getPlayerStats(user);
      user.hp = stats.maxHp;
      user.stamina = user.maxStamina;
      levelUpText = `\n${t('common:levelup', { level: user.level, defaultValue: `🎉 **LEVEL UP! → Lv.${user.level}**` })}`;
    }

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(RARITY_COLOR[fish.rarity])
      .setAuthor({
        name: t('commands/fish:author', {
          username: interaction.user.username,
          defaultValue: `${interaction.user.username} is fishing`,
        }),
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(
        t('commands/fish:caught', {
          emoji: fish.emoji,
          name: fish.name,
          rarity: fish.rarity,
          defaultValue: `**${fish.emoji} ${fish.name}** caught!\n*${fish.rarity}*`,
        }) + levelUpText,
      )
      .addFields(
        {
          name: t('commands/fish:rod', { defaultValue: '🎣 Rod' }),
          value: rodName + (fishBonus > 0 ? ` (+${Math.round(fishBonus * 100)}% rare)` : ''),
          inline: true,
        },
        {
          name: t('commands/fish:sell', { defaultValue: '💰 Sell' }),
          value: t('commands/fish:sell_value', {
            price: fish.sellPrice,
            defaultValue: `${fish.sellPrice} coins`,
          }),
          inline: true,
        },
        {
          name: t('commands/fish:exp', { defaultValue: '✨ EXP' }),
          value: `+${expGain}`,
          inline: true,
        },
      )
      .setFooter({
        text: t('commands/fish:footer', {
          defaultValue: 'Equip a fishing rod in /inventory for better catches!',
        }),
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
