import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import type { StringSelectMenuInteraction } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';

@ApplyOptions<InteractionHandler.Options>({
  name: 'invUse',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvUseHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_use_') ? this.some() : this.none();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const userId = interaction.customId.split('_')[2];
    if (interaction.user.id !== userId)
      return interaction.reply({ content: 'Not yours!', ephemeral: true });

    await interaction.deferReply({ ephemeral: true });
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    const itemId = interaction.values[0];
    const item = await this.container.db.item.findOne({ itemId }).lean();
    const invItem = user.items.find((i) => i.itemId === itemId);
    if (!item || !invItem) return interaction.editReply('Item not found');

    let msg = `✅ Used ${item.emoji} **${item.name}**`;
    let applied = 0;
    const stats = await getPlayerStats(user);

    for (const eff of item.effects || []) {
      if (eff.type === 'heal') {
        const gain = Math.min(eff.value, stats.maxHp - (user.hp ?? 0));
        if (gain > 0) {
          user.hp = (user.hp ?? 0) + gain;
          msg += `\n❤️ +${gain} HP`;
          applied++;
        }
      } else if (eff.type === 'stamina') {
        const gain = Math.min(eff.value, (user.maxStamina ?? 100) - (user.stamina ?? 0));
        if (gain > 0) {
          user.stamina = (user.stamina ?? 0) + gain;
          msg += `\n⚡ +${gain} Stamina`;
          applied++;
        }
      } else if (eff.type === 'buff') {
        user.buffs = user.buffs || [];
        user.buffs.push({ type: 'atk', value: eff.value, expires: new Date(Date.now() + 600000) });
        msg += `\n⚔️ ATK +${eff.value} (10m)`;
        applied++;
      }
    }

    if (applied === 0) return interaction.editReply(`❌ ${item.emoji} had no effect`);
    invItem.qty -= 1;
    if (invItem.qty <= 0) user.items = user.items.filter((i) => i.itemId !== itemId);
    await user.save();
    await interaction.editReply(msg);
  }
}
