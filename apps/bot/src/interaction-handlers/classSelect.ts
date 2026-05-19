import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getClass } from '../lib/rpg/classes';
import { SKILLS } from '../lib/rpg/skills'; // <-- HAPUS PASSIVES

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
        .setColor(0x95a5a6)
        .setFooter({ text: t('commands/start:already_footer') });
      return i.update({ embeds: [embed], components: [] });
    }

    const data = getClass(key as 'warrior' | 'mage' | 'rogue');
    if (!data) {
      return i.reply({
        content: t('commands/start:not_found', { defaultValue: 'Class not found.' }),
        flags: MessageFlags.Ephemeral,
      });
    }

    const skill = SKILLS[data.skillId];
    const passive = data.passiveId ? SKILLS[data.passiveId] : null; // <-- AMBIL DARI SKILLS
    const BASE_STAMINA = 100;

    await this.container.db.user.findOneAndUpdate(
      { discordId: ownerId },
      {
        $set: {
          class: key,
          username: i.user.username,
          hp: data.baseHp + 10,
          maxHp: data.baseHp,
          attack: data.baseAtk,
          critRate: data.baseCritRate,
          critDamage: 2.0,
          maxStamina: BASE_STAMINA,
          stamina: BASE_STAMINA,
          level: 1,
          exp: 0,
          balance: 1000,
          bank: 0,
          items: [],
          equipped: { weapon: null, helmet: null, armor: null, accessory: null, tool: null },
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
          desc: data.description,
          defaultValue: `*${data.description}*\n\nWelcome to Nova Chronicles. Your journey begins.`,
        }),
      )
      .addFields(
        { name: '❤️ HP', value: `**${data.baseHp + 10}**`, inline: true },
        { name: '🗡️ ATK', value: `**${data.baseAtk}**`, inline: true },
        { name: '⚡ Stamina', value: `**${BASE_STAMINA}**`, inline: true },
        {
          name: '🎯 Crit Rate',
          value: `**${(data.baseCritRate * 100).toFixed(0)}%**`,
          inline: true,
        },
        { name: '✨ Skill', value: `**${skill.name}**`, inline: true },
        { name: '💰 Starting Capital', value: `**1,000** coins`, inline: true },
      )
      .setColor(0xf1c40f)
      .setFooter({
        text: t('commands/start:tip', { defaultValue: 'Tip: /profile for status • /hunt to hunt' }),
      })
      .setTimestamp();

    if (passive) {
      embed.addFields({
        name: '🔮 Passive',
        value: `**${passive.name}**`,
        inline: true,
      });
    }

    return i.update({ embeds: [embed], components: [] });
  }
}
