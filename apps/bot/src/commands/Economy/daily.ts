import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Command.Options>({
  name: 'daily',
  description: 'Claim your daily coins (1000 coins)!',
  fullCategory: ['Economy'],
})
export class DailyCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:daily', 'commands/descriptions:daily'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();

    const reward = 1000;
    const staminaBonus = 20;
    const cd = 24 * 60 * 60 * 1000;
    const now = new Date();

    try {
      const user = await this.container.db.user.findOne({ discordId: interaction.user.id });

      if (!user) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setTitle(t('commands/daily:not_registered_title', { defaultValue: '❌ Not Registered' }))
          .setDescription(
            t('commands/daily:not_registered_desc', {
              defaultValue: 'Use `/start` first to create a character before claiming daily.',
            }),
          );
        return interaction.editReply({ embeds: [embed] });
      }

      const last = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;

      if (now.getTime() - last < cd) {
        const remain = cd - (now.getTime() - last);
        const h = Math.floor(remain / 3600000);
        const m = Math.floor((remain % 3600000) / 60000);

        const embed = new EmbedBuilder()
          .setColor(0xe67e22)
          .setTitle(t('commands/daily:cooldown_title', { defaultValue: '⏳ Daily Cooldown' }))
          .setDescription(
            t('commands/daily:cooldown_desc', {
              h,
              m,
              defaultValue: `You already claimed today.\nTry again in **${h}h ${m}m**.`,
            }),
          )
          .setFooter({
            text: t('commands/daily:cooldown_footer', { defaultValue: 'Resets every 24 hours' }),
          });

        return interaction.editReply({ embeds: [embed] });
      }

      const newStamina = Math.min(user.stamina + staminaBonus, user.maxStamina);
      const actualStaminaGain = newStamina - user.stamina;

      await this.container.db.user.updateOne(
        { discordId: interaction.user.id },
        {
          $inc: { balance: reward },
          $set: { lastDaily: now, stamina: newStamina },
        },
      );

      const newBalance = user.balance + reward;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle(t('commands/daily:title', { defaultValue: '💰 Daily Reward' }))
        .setDescription(
          t('commands/daily:desc', { defaultValue: 'Daily reward claimed successfully!' }),
        )
        .addFields(
          {
            name: t('commands/daily:coins', { defaultValue: 'Coins' }),
            value: `+${reward.toLocaleString(interaction.locale)}`,
            inline: true,
          },
          {
            name: t('commands/daily:stamina', { defaultValue: 'Stamina' }),
            value: `+${actualStaminaGain}`,
            inline: true,
          },
          {
            name: t('commands/daily:new_balance', { defaultValue: 'New Balance' }),
            value: `${newBalance.toLocaleString(interaction.locale)} ${t('commands/shop:coins', { defaultValue: 'coins' })}`,
            inline: true,
          },
        )
        .setFooter({
          text: t('commands/daily:footer', {
            stamina: newStamina,
            max: user.maxStamina,
            defaultValue: `Stamina: ${newStamina}/${user.maxStamina} • Come back tomorrow`,
          }),
        })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (e) {
      this.container.logger.error(e);
      const err = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setDescription(t('commands/daily:error', { defaultValue: '❌ Failed to process daily.' }));
      return interaction.editReply({ embeds: [err] });
    }
  }
}
