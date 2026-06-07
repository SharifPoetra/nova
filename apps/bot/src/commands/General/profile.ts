import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen, getAtkBuff } from '../../lib/rpg/buffs.ts';
import { getClass } from '../../lib/rpg/classes.ts';
import { BASE_MONSTERS } from '../../lib/rpg/monsters.ts';
import { getExpNeeded } from '../../lib/rpg/leveling.ts';
import { getPlayerStats } from '../../lib/rpg/combat.ts';
import { SKILLS } from '../../lib/rpg/skills.ts';
import { localized } from '../../lib/i18n/localize.ts';
import { i18nMonster } from '../../lib/i18n/display.ts';
import { getItemDisplay } from '../../lib/i18n/item-registry.ts';
import { renderProfileCard } from '../../lib/canvas/profile-card.ts';

@ApplyOptions<Command.Options>({
  name: 'profile',
  description: 'View your Nova RPG profile',
  fullCategory: ['General'],
})
export class ProfileCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    const name = localized('commands/names:profile');
    const description = localized('commands/descriptions:profile');
    const optDesc = localized('commands/descriptions:profile_option_user');

    registry.registerChatInputCommand((builder) =>
      builder
        .setName(name.default)
        .setNameLocalizations(name.localizations)
        .setDescription(description.default)
        .setDescriptionLocalizations(description.localizations)
        .addStringOption((option) =>
          option
            .setName('user')
            .setDescription(optDesc.default)
            .setDescriptionLocalizations(optDesc.localizations)
            .setRequired(false),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const target = interaction.options.getUser('user') ?? interaction.user;
    await interaction.deferReply();

    try {
      const isSelf = target.id === interaction.user.id;
      const baseSelect = 'buffs stamina maxStamina level exp balance bank items class equipped createdAt hp';
      const userData = isSelf
        ? await this.container.db.user.findOne({ discordId: target.id }).select(baseSelect)
        : await this.container.db.user.findOne({ discordId: target.id }).select(baseSelect).lean();

      if (!userData) {
        return interaction.editReply(
          target.id === interaction.user.id
            ? t('commands/profile:not_registered_self', {
                defaultValue: '❌ You are not registered! Use `/start`.',
              })
            : t('commands/profile:not_registered_other', {
                user: target.username,
                defaultValue: `❌ **${target.username}** hasn't started yet.`,
              }),
        );
      }

      const activeBg = await this.container.db.userBackground
        ?.findOne({ discordId: target.id, isActive: true })
        .select('backgroundId')
        .lean();

      const backgroundId = activeBg?.backgroundId || 'default';

      if (isSelf) {
        applyPassiveRegen(userData);
        await userData.save();
      } else {
        userData.buffs = (userData.buffs || []).filter((b) => new Date(b.expires ?? 0) > new Date());
      }

      const stats = await getPlayerStats(userData);
      const now = Date.now();
      const hp = stats.hp;
      const maxHp = stats.maxHp;
      const stamina = userData.stamina ?? 100;
      const maxStamina = userData.maxStamina ?? 100;
      const level = userData.level ?? 1;
      const exp = userData.exp ?? 0;
      const expNeeded = getExpNeeded(level);
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
      const bonusAtkPercent = Math.round(bonusAtk * 100);
      const activeBuffs = (userData.buffs || []).filter((b) => new Date(b.expires ?? 0) > new Date());

      const equippedIds = [
        userData.equipped?.weapon,
        userData.equipped?.armor,
        userData.equipped?.helmet,
        userData.equipped?.accessory,
        userData.equipped?.tool,
      ].filter(Boolean) as string[];

      const equippedData = equippedIds.length
        ? await this.container.db.item.find({ itemId: { $in: equippedIds } }).lean()
        : [];
      const eqMap = new Map(equippedData.map((i) => [i.itemId, i]));

      const getEquip = async (id?: string | null) => {
        if (!id) return null;
        const item = eqMap.get(id);
        if (!item) return null;
        const display = await getItemDisplay(item.itemId, t);
        return { emoji: item.emoji ?? '📦', name: display?.name ?? item.itemId };
      };

      const equipment = (
        await Promise.all([
          getEquip(userData.equipped?.weapon),
          getEquip(userData.equipped?.armor),
          getEquip(userData.equipped?.helmet),
          getEquip(userData.equipped?.accessory),
          getEquip(userData.equipped?.tool),
        ])
      ).filter(Boolean) as { emoji: string; name: string }[];

      const skills = stats.availableSkills.slice(0, 3).map((id) => {
        const s = SKILLS[id];
        return { emoji: s?.emoji ?? '✨', name: s?.name ?? id };
      });

      const buffs = activeBuffs.slice(0, 4).map((b) => {
        const mins = Math.max(0, Math.ceil((new Date(b.expires ?? 0).getTime() - now) / 60000));
        const label = t(`commands/profile:buff_${b.type}`, { defaultValue: b.type });
        const value = ['atk', 'def', 'hp'].includes(b.type) ? `${Math.round(b.value * 100)}%` : `+${b.value}`;
        return `${label} ${value}`;
      });

      const nextUnlock = BASE_MONSTERS.filter((m) => m.minLevel > level).sort((a, b) => a.minLevel - b.minLevel)[0];
      const nextUnlockName = nextUnlock ? i18nMonster('hunt', nextUnlock.id, t) : '';
      const nextUnlockText = nextUnlock ? `${nextUnlockName} Lv.${nextUnlock.minLevel}` : 'MAX';

      const profileData = {
        username: target.username,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 128 }),
        level,
        exp,
        expNeeded,
        balance,
        bank,
        hp,
        maxHp,
        stamina,
        maxStamina,
        atk: stats.atk,
        def: stats.def,
        critRate: stats.critRate * 100,
        critDmg: stats.critDmg * 100,
        bonusAtk: bonusAtkPercent,
        className,
        classEmoji,
        classColor: `#${color.toString(16).padStart(6, '0')}`,
        equipment,
        skills,
        buffs,
        itemCount,
        nextUnlock: nextUnlockText,
        backgroundId,
      };

      const buffer = await renderProfileCard(profileData);
      const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

      return interaction.editReply({ files: [attachment] });
    } catch (error) {
      this.container.logger.error(error);
      const t = await fetchT(interaction);
      return interaction.editReply(t('commands/profile:error', { defaultValue: '❌ Error fetching data.' }));
    }
  }
}
