import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getClass } from '../lib/rpg/classes';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ClassSelectHandler extends InteractionHandler {
  public override parse(i) {
    return i.isButton() && i.customId.startsWith('class_') ? this.some() : this.none();
  }

  public async run(i: ButtonInteraction) {
    const t = await fetchT(i);
    const [, key, ownerId] = i.customId.split('_');

    if (i.user.id !== ownerId) {
      return i.reply({
        content: t('commands/start:not_yours', {
          defaultValue: '😅 Hey, this is not your button! Type /start.',
        }),
        flags: MessageFlags.Ephemeral,
      });
    }

    const exists = await this.container.db.user.findOne({ discordId: ownerId });
    if (exists?.class) {
      const existingClass = getClass(exists.class);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: i.user.username,
          iconURL: i.user.displayAvatarURL(),
        })
        .setTitle(t('commands/start:already_title'))
        .setDescription(
          t('commands/start:already_desc', { class: existingClass?.name ?? exists.class }),
        )
        .setColor(existingClass?.color ?? 0x95a5a6)
        .setFooter({ text: t('commands/start:already_footer') });
      return i.update({ embeds: [embed], components: [] });
    }

    const data = getClass(key);
    if (!data) {
      return i.reply({
        content: t('commands/start:not_found', { defaultValue: 'Class not found.' }),
        flags: MessageFlags.Ephemeral,
      });
    }

    await this.container.db.user.findOneAndUpdate(
      { discordId: ownerId },
      {
        $set: {
          class: data.key,
          username: i.user.username,
          hp: data.hp,
          maxHp: data.hp,
          attack: data.atk,
          maxStamina: data.stamina,
          stamina: data.stamina,
          level: 1,
          exp: 0,
          balance: 1000,
          bank: 0,
          items: [],
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: t('commands/start:chosen_author', {
          username: i.user.username,
          class: data.name,
          defaultValue: `${i.user.username} chose ${data.name}`,
        }),
        iconURL: i.user.displayAvatarURL(),
      })
      .setTitle(
        t('commands/start:awakened', {
          emoji: data.emoji,
          class: data.name,
          defaultValue: `${data.emoji} ${data.name} Awakened!`,
        }),
      )
      .setDescription(
        t('commands/start:awakened_desc', {
          desc: data.desc,
          defaultValue: `*${data.desc}*\n\nWelcome to Nova Chronicles. Your journey begins.`,
        }),
      )
      .addFields(
        {
          name: t('commands/start:hp', { defaultValue: '❤️ HP' }),
          value: `**${data.hp}**`,
          inline: true,
        },
        {
          name: t('commands/start:atk', { defaultValue: '🗡️ ATK' }),
          value: `**${data.atk}**`,
          inline: true,
        },
        {
          name: t('commands/start:stamina', { defaultValue: '⚡ Stamina' }),
          value: `**${data.stamina}**`,
          inline: true,
        },
        {
          name: t('commands/start:starting', { defaultValue: '💰 Starting Capital' }),
          value: `**1,000** ${t('commands/sell:coins', { defaultValue: 'coins' })}`,
          inline: true,
        },
      )
      .setColor(data.color)
      .setFooter({
        text: t('commands/start:tip', { defaultValue: 'Tip: /profile for status • /hunt to hunt' }),
      })
      .setTimestamp();

    return i.update({ embeds: [embed], components: [] });
  }
}
