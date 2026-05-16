import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { CLASSES, getClass } from '../../lib/rpg/classes';

@ApplyOptions<Command.Options>({
  name: 'start',
  description: 'Start your adventure in Nova Chronicles and choose a Class!',
  fullCategory: ['RPG'],
})
export class StartCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:start', 'commands/descriptions:start'),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const userId = interaction.user.id;
    const user = await this.container.db.user.findOne({ discordId: userId });

    if (user?.class) {
      const existing = getClass(user.class);
      const embed = new EmbedBuilder()
        .setAuthor({
          name: interaction.user.username,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTitle(
          t('commands/start:already_title', { defaultValue: '😅 You Already Have a Class' }),
        )
        .setDescription(
          t('commands/start:already_desc', {
            class: existing?.name ?? user.class,
            defaultValue: `You are already registered as **${existing?.name ?? user.class}**.\nClass cannot be changed, continue your adventure!`,
          }),
        )
        .setColor(existing?.color ?? 0x95a5a6)
        .setFooter({
          text: t('commands/start:already_footer', { defaultValue: 'Use /profile to view status' }),
        });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const classList = Object.values(CLASSES);

    const embed = new EmbedBuilder()
      .setTitle(
        t('commands/start:title', { defaultValue: '🛡️ Nova Chronicles — Choose Your Destiny' }),
      )
      .setDescription(
        t('commands/start:welcome', {
          username: interaction.user.username,
          defaultValue: `Welcome, **${interaction.user.username}**!\nThe world of Nova is in chaos, choose your class now and get **1,000 coins** as starting capital.`,
        }),
      )
      .addFields(
        classList.map((c) => ({
          name: `${c.emoji} ${c.name}`,
          value: t('commands/start:class_field', {
            desc: c.desc,
            hp: c.hp,
            atk: c.atk,
            stamina: c.stamina,
            passive: c.passive,
            defaultValue: `**${c.desc}**\n❤️ ${c.hp} HP | 🗡️ ${c.atk} ATK | ⚡ ${c.stamina} Stamina\n*Passive: ${c.passive}*`,
          }),
          inline: false,
        })),
      )
      .setColor(0xf1c40f)
      .setFooter({
        text: t('commands/start:footer', {
          defaultValue: 'Choose wisely — class cannot be changed!',
        }),
      })
      .setThumbnail(interaction.user.displayAvatarURL());

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      classList.map((c) =>
        new ButtonBuilder()
          .setCustomId(`class_${c.key}_${userId}`)
          .setLabel(t(`commands/start:class_${c.key}`, { defaultValue: c.name }))
          .setEmoji(c.emoji)
          .setStyle(
            c.key === 'warrior'
              ? ButtonStyle.Danger
              : c.key === 'mage'
                ? ButtonStyle.Primary
                : ButtonStyle.Success,
          ),
      ),
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
}
