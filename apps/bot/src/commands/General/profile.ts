import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs';
import { getClass } from '../../lib/rpg/classes';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { getExpNeeded } from '../../lib/rpg/leveling';
import { colorBar } from '../../lib/utils';

@ApplyOptions<Command.Options>({
  name: 'profile',
  description: 'View your Nova RPG profile',
  fullCategory: ['General'],
})
export class ProfileCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(
        builder,
        'commands/names:profile',
        'commands/descriptions:profile',
      ).addUserOption((o) =>
        o
          .setName('user')
          .setDescription('User to view')
          .setDescriptionLocalizations({
            'en-US': 'User to view',
            'en-GB': 'User to view',
            id: 'User yang ingin dilihat',
          })
          .setRequired(false),
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const target = interaction.options.getUser('user') ?? interaction.user;
    await interaction.deferReply();

    try {
      const userData = await this.container.db.user.findOne({ discordId: target.id });
      if (!userData) {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c)
          .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
          .setDescription(
            target.id === interaction.user.id
              ? t('commands/profile:not_registered_self', {
                  defaultValue: '❌ You are not registered! Use `/start`.',
                })
              : t('commands/profile:not_registered_other', {
                  user: target.username,
                  defaultValue: `❌ **${target.username}** hasn't started yet.`,
                }),
          );
        return interaction.editReply({ embeds: [embed] });
      }

      const isSelf = target.id === interaction.user.id;
      if (isSelf) {
        applyPassiveRegen(userData);
        await userData.save();
      } else {
        userData.buffs = (userData.buffs || []).filter((b) => new Date(b.expires) > new Date());
      }

      const now = Date.now();
      const hp = userData.hp ?? 100;
      const maxHp = userData.maxHp ?? 100;
      const stamina = userData.stamina ?? 100;
      const maxStamina = userData.maxStamina ?? 100;
      const level = userData.level ?? 1;
      const exp = userData.exp ?? 0;
      const expNeeded = getExpNeeded(level);
      const expNext = expNeeded - exp;
      const balance = userData.balance ?? 0;
      const bank = userData.bank ?? 0;
      const itemCount = userData.items?.reduce((a, b) => a + b.qty, 0) || 0;
      const classData = getClass(userData.class);
      const color = classData?.color ?? 0x3498db;
      const classEmoji = classData?.emoji ?? '👤';
      const className = t(`classes:${userData.class ?? 'adventurer'}`, {
        defaultValue: classData?.name ?? 'Adventurer',
      });

      const bonusAtk = getAtkBuff(userData);
      const activeBuffs = (userData.buffs || []).filter((b) => new Date(b.expires) > new Date());

      const buffText = activeBuffs.length
        ? activeBuffs
            .map((b) => {
              const mins = Math.max(0, Math.ceil((new Date(b.expires).getTime() - now) / 60000));
              const icon = b.type === 'atk' ? '⚔️' : b.type === 'stamina_regen' ? '⚡' : '✨';
              const label = t(`commands/profile:buff_${b.type}`, { defaultValue: b.type });
              return `${icon} ${label} +${b.value} (${mins}m)`;
            })
            .join('\n')
        : t('commands/profile:no_buffs', { defaultValue: 'None' });

      const atkDisplay =
        bonusAtk > 0
          ? `**${userData.attack ?? 10}** (+${bonusAtk}) 🔥`
          : `**${userData.attack ?? 10}**`;

      const nextUnlock = BASE_MONSTERS.filter((m) => m.minLevel > level).sort(
        (a, b) => a.minLevel - b.minLevel,
      )[0];

      const footerText = nextUnlock
        ? t('commands/profile:footer_next', {
            name: nextUnlock.name,
            level: nextUnlock.minLevel,
            exp: expNext,
            defaultValue: `🎯 ${nextUnlock.name} unlocks at Lv.${nextUnlock.minLevel} • ${expNext} EXP left`,
          })
        : t('commands/profile:footer_max', {
            defaultValue: '🏆 All monsters unlocked! You are a Nova legend',
          });

      const embed = new EmbedBuilder()
        .setAuthor({
          name: t('commands/profile:author', {
            user: target.username,
            defaultValue: `Nova Chronicles — ${target.username}`,
          }),
          iconURL: target.displayAvatarURL(),
        })
        .setThumbnail(target.displayAvatarURL({ size: 256 }))
        .setColor(color)
        .setDescription(
          t('commands/profile:quote', {
            defaultValue: '*“Every step in Nova Tower writes destiny.”*',
          }),
        )
        .addFields(
          {
            name: t('commands/profile:wallet', { defaultValue: '💰 Wallet' }),
            value: `**${balance.toLocaleString(t('common:locale', { defaultValue: 'en-US' }))}**`,
            inline: true,
          },
          {
            name: t('commands/profile:bank', { defaultValue: '🏦 Bank' }),
            value: `**${bank.toLocaleString(t('common:locale', { defaultValue: 'en-US' }))}**`,
            inline: true,
          },
          {
            name: t('commands/profile:inventory', { defaultValue: '🎒 Inventory' }),
            value: t('commands/profile:inventory_value', {
              count: itemCount,
              defaultValue: `${itemCount} items`,
            }),
            inline: true,
          },
          {
            name: `${classEmoji} ${className} — Lv.${level}`,
            value: `${colorBar(exp, expNeeded, 10, '🟦', '⬜')} \`${exp}/${expNeeded} EXP\` • **${t('commands/profile:exp_left', { exp: expNext, defaultValue: `${expNext} left` })}**`,
            inline: false,
          },
          {
            name: t('commands/profile:vitality', { defaultValue: '❤️ Vitality' }),
            value: `${colorBar(hp, maxHp, 10, '🟥', '⬛')} \`${hp}/${maxHp}\``,
            inline: true,
          },
          {
            name: t('commands/profile:stamina', { defaultValue: '⚡ Stamina' }),
            value: `${colorBar(stamina, maxStamina, 10, '🟨', '⬛')} \`${stamina}/${maxStamina}\``,
            inline: true,
          },
          {
            name: t('commands/profile:attack', { defaultValue: '🗡️ Attack' }),
            value: atkDisplay,
            inline: true,
          },
          {
            name: t('commands/profile:buffs', { defaultValue: '✨ Active Buffs' }),
            value: buffText,
            inline: false,
          },
          {
            name: t('commands/profile:joined', { defaultValue: '📅 Joined' }),
            value: `<t:${Math.floor(new Date(userData.createdAt).getTime() / 1000)}:D>`,
            inline: true,
          },
        )
        .setFooter({ text: footerText });

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      this.container.logger.error(error);
      const t = await fetchT(interaction);
      return interaction.editReply(
        t('commands/profile:error', { defaultValue: '❌ Error fetching data.' }),
      );
    }
  }
}
