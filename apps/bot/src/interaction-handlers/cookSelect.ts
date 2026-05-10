import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { StringSelectMenuInteraction, EmbedBuilder } from 'discord.js';
import { getRecipe } from '../lib/rpg/recipes';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { ACTION_COST } from '../lib/rpg/actions';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export class CookSelectHandler extends InteractionHandler {
  public override parse(i) {
    return i.isStringSelectMenu() && i.customId.startsWith('cook_') ? this.some() : this.none();
  }

  public async run(i: StringSelectMenuInteraction) {
    const [, ownerId] = i.customId.split('_');
    if (i.user.id !== ownerId) {
      return i.reply({ content: 'Ini bukan kompor kamu 😅', ephemeral: true });
    }

    await i.deferUpdate();
    const user = await this.container.db.user.findOne({ discordId: ownerId });
    if (!user) return;

    applyPassiveRegen(user);

    // stamina check
    if ((user.stamina ?? 0) < ACTION_COST.cook) {
      return i.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`⚡  Stamina kurang! Butuh ${ACTION_COST.cook} untuk masak.`),
        ],
        components: [],
      });
    }

    const recipe = getRecipe(i.values[0]);
    if (!recipe) return;

    // verify ingredients lagi (anti cheat)
    const hasAll = recipe.ingredients.every(
      (ing) => (user.items.find((x) => x.itemId === ing.id)?.qty || 0) >= ing.qty,
    );
    if (!hasAll) {
      return i.editReply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('Bahan tidak cukup!')],
        components: [],
      });
    }

    // consume
    for (const ing of recipe.ingredients) {
      const it = user.items.find((x) => x.itemId === ing.id)!;
      it.qty -= ing.qty;
    }
    user.items = user.items.filter((x) => x.qty > 0);
    user.stamina -= ACTION_COST.cook;

    const before = user.hp;
    user.hp = Math.min(user.maxHp, before + recipe.heal);

    let buffText = '';
    if (recipe.buff) {
      user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > new Date());
      user.buffs.push({
        type: recipe.buff.type,
        value: recipe.buff.value,
        expires: new Date(Date.now() + recipe.buff.duration),
      });
      buffText = `\n✨ Buff: **${recipe.buff.type.toUpperCase()} +${recipe.buff.value}** (${recipe.buff.duration / 60000} menit)`;
    }

    await user.save();

    const result = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Masakan Selesai')
      .setDescription(`${recipe.emoji} **${recipe.name}** dimasak!${buffText}`)
      .addFields(
        { name: '❤️ HP', value: `${before} → ${user.hp}`, inline: true },
        { name: '⚡ Stamina', value: `-${ACTION_COST.cook} → ${user.stamina}`, inline: true },
      );

    return i.editReply({ embeds: [result], components: [] });
  }
}
