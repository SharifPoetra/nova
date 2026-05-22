import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags, StringSelectMenuInteraction } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';
import { getItemDisplay } from '../lib/rpg/item-registry';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<InteractionHandler.Options>({
  name: 'invUse',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvUseHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_use_') ? this.some() : this.none();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const userId = interaction.customId.split('_')[2];
    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not yours!' }),
        flags: MessageFlags.Ephemeral,
      });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    const itemId = interaction.values[0];
    const item = await this.container.db.item.findOne({ itemId }).lean();
    const invItem = user.items.find((i) => i.itemId === itemId);
    if (!item || !invItem)
      return interaction.editReply(
        t('commands/inventory:item_not_found', { defaultValue: 'Item not found' }),
      );

    const display = await getItemDisplay(itemId, t);
    const itemName = display?.name ?? item.name;
    let msg = t('commands/inventory:used', {
      emoji: item.emoji,
      name: itemName,
      defaultValue: `✅ Used ${item.emoji} **${itemName}**`,
    });
    let applied = 0;
    const stats = await getPlayerStats(user);

    for (const eff of item.effects || []) {
      if (eff.type === 'heal') {
        const gain = Math.min(eff.value, stats.maxHp - (user.hp ?? 0));
        if (gain > 0) {
          user.hp = (user.hp ?? 0) + gain;
          msg += `\n${t('commands/inventory:heal_gain', { gain, defaultValue: `❤️ +${gain} HP` })}`;
          applied++;
        }
      } else if (eff.type === 'stamina') {
        const gain = Math.min(eff.value, (user.maxStamina ?? 100) - (user.stamina ?? 0));
        if (gain > 0) {
          user.stamina = (user.stamina ?? 0) + gain;
          msg += `\n${t('commands/inventory:stam_gain', { gain, defaultValue: `⚡ +${gain} Stamina` })}`;
          applied++;
        }
      } else if (eff.type === 'buff') {
        user.buffs = user.buffs || [];
        user.buffs.push({
          type: 'atk',
          value: eff.value,
          expires: new Date(Date.now() + 600000),
        });

        const percent = Math.round(eff.value * 100);
        msg += `\n${t('commands/inventory:buff_gain', {
          value: percent,
          stat: 'ATK',
          mins: 10,
          defaultValue: `⚔️ ATK +${percent}% (10m)`,
        })}`;
        applied++;
      }
    }

    if (applied === 0)
      return interaction.editReply(
        t('commands/inventory:no_effect', {
          emoji: item.emoji,
          defaultValue: `❌ ${item.emoji} had no effect`,
        }),
      );

    invItem.qty -= 1;
    if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
    await user.save();
    await interaction.editReply(msg);
  }
}
