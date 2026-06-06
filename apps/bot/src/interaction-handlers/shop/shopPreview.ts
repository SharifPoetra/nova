import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  ButtonInteraction,
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { renderProfileCard } from '../../lib/canvas/profile-card';
import { getPlayerStats } from '../../lib/rpg/combat';
import { getClass } from '../../lib/rpg/classes';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { getExpNeeded } from '../../lib/rpg/leveling';
import { SKILLS } from '../../lib/rpg/skills';
import { i18nMonster } from '../../lib/i18n/display';
import { getItemDisplay } from '../../lib/i18n/item-registry';
import { getBackgroundInfo } from '../../lib/canvas/backgrounds';
import { COLORS, formatNumber } from '../../lib/utils';
import { getItemById } from '../../lib/shop/categories';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

@ApplyOptions({
  name: 'shopPreview',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class ShopPreviewHandler extends InteractionHandler {
  public override parse(interaction) {
    return interaction.isButton() && interaction.customId.startsWith('shop_preview_') ? this.some() : this.none();
  }

  public async run(interaction: ButtonInteraction) {
    const t = await fetchT(interaction);
    const customIdParts = interaction.customId.split('_');
    const userId = customIdParts[2];
    const bgId = customIdParts[3];
    const pageStr = customIdParts[4] || '0';

    // User validation
    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: t('common:error.not_yours'),
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    try {
      const user = await this.container.db.user.findOne({ discordId: userId });
      if (!user) {
        return interaction.editReply({
          content: t('common:need_start', { defaultValue: '❌ You need to start first. Use `/start`.' }),
        });
      }

      applyPassiveRegen(user);

      // Get background info
      const backgroundInfo = getBackgroundInfo(bgId);
      const item = getItemById('backgrounds', `bg_${bgId}`);

      if (!item) {
        return interaction.editReply({
          content: t('commands/shop:item_not_found', { defaultValue: '❌ Background not found.' }),
        });
      }

      // Prepare profile data untuk rendering
      const stats = await getPlayerStats(user);
      const classData = getClass(user.class);
      const color = classData?.color ?? 0x3498db;
      const classEmoji = classData?.emoji ?? '👤';
      const className = t(`classes:${user.class ?? 'adventurer'}`, {
        defaultValue: classData?.name ?? 'Adventurer',
      });

      const level = user.level ?? 1;
      const exp = user.exp ?? 0;
      const expNeeded = getExpNeeded(level);
      const balance = user.balance ?? 0;
      const bank = user.bank ?? 0;
      const itemCount = user.items?.reduce((a, b) => a + b.qty, 0) || 0;
      const hp = stats.hp;
      const maxHp = stats.maxHp;
      const stamina = user.stamina ?? 100;
      const maxStamina = user.maxStamina ?? 100;

      // Get equipment & skills untuk profile card
      const equippedIds = [
        user.equipped?.weapon,
        user.equipped?.armor,
        user.equipped?.helmet,
        user.equipped?.accessory,
        user.equipped?.tool,
      ].filter(Boolean) as string[];

      const equippedData = equippedIds.length
        ? await this.container.db.item.find({ itemId: { $in: equippedIds } }).lean()
        : [];
      const eqMap = new Map(equippedData.map((i) => [i.itemId, i]));

      const getEquip = async (id?: string | null) => {
        if (!id) return null;
        const equipItem = eqMap.get(id);
        if (!equipItem) return null;
        const display = await getItemDisplay(equipItem.itemId, t);
        return { emoji: equipItem.emoji ?? '📦', name: display?.name ?? equipItem.itemId };
      };

      const equipment = (
        await Promise.all([
          getEquip(user.equipped?.weapon),
          getEquip(user.equipped?.armor),
          getEquip(user.equipped?.helmet),
          getEquip(user.equipped?.accessory),
          getEquip(user.equipped?.tool),
        ])
      ).filter(Boolean) as { emoji: string; name: string }[];

      const skills = stats.availableSkills.slice(0, 3).map((id) => {
        const s = SKILLS[id];
        return { emoji: s?.emoji ?? '✨', name: s?.name ?? id };
      });

      const now = Date.now();
      const activeBuffs = (user.buffs || []).filter((b) => new Date(b.expires ?? 0) > new Date());
      const buffs = activeBuffs.slice(0, 4).map((b) => {
        const mins = Math.max(0, Math.ceil((new Date(b.expires ?? 0).getTime() - now) / 60000));
        const label = t(`commands/profile:buff_${b.type}`, { defaultValue: b.type });
        const value = ['atk', 'def', 'hp'].includes(b.type) ? `${Math.round(b.value * 100)}%` : `+${b.value}`;
        return `${label} ${value}`;
      });

      const nextUnlock = BASE_MONSTERS.filter((m) => m.minLevel > level).sort((a, b) => a.minLevel - b.minLevel)[0];
      const nextUnlockName = nextUnlock ? i18nMonster('hunt', nextUnlock.id, t) : '';
      const nextUnlockText = nextUnlock ? `${nextUnlockName} Lv.${nextUnlock.minLevel}` : 'MAX';

      // Render preview card dengan background sementara
      const profileData = {
        username: interaction.user.username,
        avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 128 }),
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
        bonusAtk: 0,
        className,
        classEmoji,
        classColor: `#${color.toString(16).padStart(6, '0')}`,
        equipment,
        skills,
        buffs,
        itemCount,
        nextUnlock: nextUnlockText,
        backgroundId: bgId, // ← Preview dengan background ini
      };

      const buffer = await renderProfileCard(profileData);
      const attachment = new AttachmentBuilder(buffer, { name: 'preview.png' });

      // Show preview dengan confirm buttons
      const embed = new EmbedBuilder()
        .setColor(item.rarityColor || COLORS.primary)
        .setTitle(t('commands/shop:preview_render', { defaultValue: '🎨 Background Preview' }))
        .setDescription(
          `${item.emoji} **${item.name}**\n\n` +
            `${item.description}\n\n` +
            `**Price:** ${formatNumber(item.price)} 💰`,
        )
        .setImage('attachment://preview.png')
        .setFooter({
          text: t('commands/shop:preview_footer', {
            defaultValue: 'This is how your profile will look with this background',
          }),
        });

      const buttons = [
        new ButtonBuilder()
          .setCustomId(`shop_confirm_${userId}_backgrounds_bg_${bgId}_${pageStr}`)
          .setLabel(t('common:ui.confirm'))
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`shop_cat_${userId}_backgrounds_${pageStr}`)
          .setLabel(t('common:ui.cancel'))
          .setStyle(ButtonStyle.Secondary),
      ];

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
        components: [row],
      });
    } catch (error) {
      this.container.logger.error(error);
      await interaction
        .editReply({
          content: t('commands/shop:error', { defaultValue: '❌ An error occurred.' }),
        })
        .catch(() => {});
    }
  }
}
