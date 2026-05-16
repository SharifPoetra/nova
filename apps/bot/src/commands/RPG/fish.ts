import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR } from '../../lib/utils';
import { catchFish } from '../../lib/rpg/fishes';
import { ACTION_COST } from '../../lib/rpg/actions';

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
        t('common:need_start', { defaultValue: '❌  Use /start first.' }),
      );

    applyPassiveRegen(user);
    const now = Date.now();
    const cd = 30_000;
    if (now - (user.lastFish?.getTime() ?? 0) < cd) {
      const wait = Math.ceil((cd - (now - (user.lastFish?.getTime() ?? 0))) / 1000);
      await user.save();
      return interaction.editReply(
        t('commands/fish:cooldown', { wait, defaultValue: `🎣 Rod is still wet! Wait ${wait}s` }),
      );
    }
    if (user.stamina < ACTION_COST.fish) {
      await user.save();
      return interaction.editReply(
        t('commands/fish:low_stamina', {
          current: user.stamina,
          cost: ACTION_COST.fish,
          defaultValue: `⚡ Not enough stamina (${user.stamina}/${ACTION_COST.fish})`,
        }),
      );
    }

    const fish = catchFish();

    user.stamina -= ACTION_COST.fish;
    user.lastFish = new Date();
    user.exp = (user.exp ?? 0) + fish.xp;

    const inv = user.items.find((i) => i.itemId === fish.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: fish.id, qty: 1 });

    await this.container.db.item.updateOne(
      { itemId: fish.id },
      {
        $set: {
          name: fish.name,
          emoji: fish.emoji,
          type: fish.type,
          rarity: fish.rarity,
          sellPrice: fish.sellPrice,
          description: fish.description,
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const levelData = checkLevelUp(user);
    if (levelData) {
      Object.assign(user, levelData);
      levelUpText = `\n${t('commands/fish:levelup', { level: levelData.level, defaultValue: `🎉 **LEVEL UP! → Lv.${levelData.level}**` })}`;
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
          name: t('commands/fish:sell', { defaultValue: '💰 Sell' }),
          value: t('commands/fish:sell_value', {
            price: fish.sellPrice,
            defaultValue: `${fish.sellPrice} coins`,
          }),
          inline: true,
        },
        {
          name: t('commands/fish:cook', { defaultValue: '🍳 Cook' }),
          value: t('commands/fish:cook_value', { defaultValue: 'Can be used for Fish Soup' }),
          inline: true,
        },
        {
          name: t('commands/fish:exp', { defaultValue: '✨ EXP' }),
          value: `+${fish.xp}`,
          inline: true,
        },
        {
          name: t('commands/fish:stamina', { defaultValue: '⚡ Stamina' }),
          value: t('commands/fish:stamina_value', {
            before: user.stamina + ACTION_COST.fish,
            after: user.stamina,
            defaultValue: `${user.stamina + ACTION_COST.fish} → ${user.stamina}`,
          }),
          inline: true,
        },
      )
      .setFooter({
        text: t('commands/fish:footer', { defaultValue: 'Use /cook to heal before hunt' }),
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
