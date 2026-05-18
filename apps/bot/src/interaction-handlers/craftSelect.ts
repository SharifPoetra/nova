import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  StringSelectMenuInteraction,
  ButtonInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { getCraftingRecipe, CRAFTING_RECIPES } from '../lib/rpg/crafting-recipes';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { ACTION_COST } from '../lib/rpg/actions';
import { getPlayerStats } from '../lib/rpg/combat';
import { EQUIPMENTS } from '../lib/rpg/equipments';

const CATEGORY_FILTERS: Record<string, (r: any) => boolean> = {
  tool: (r) => r.category === 'tool',
  weapon: (r) => r.category === 'weapon',
  armor: (r) => r.category === 'armor',
  all: () => true,
};

@ApplyOptions({
  name: 'craftSelect',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class CraftSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    const isSelect = interaction.isStringSelectMenu() && interaction.customId.startsWith('craft_');
    const isBtn = interaction.isButton() && interaction.customId.startsWith('craft');
    return isSelect || isBtn ? this.some() : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const t = await fetchT(interaction);
    const [, userId, pageStr, cat = 'all'] = interaction.customId.split('_');
    const isPrev = interaction.customId.startsWith('craftprev');
    const isNext = interaction.customId.startsWith('craftnext');

    if (interaction.user.id !== userId)
      return interaction.reply({ content: 'Not your forge 😅', ephemeral: true });
    await interaction.deferUpdate();

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);
    const stats = await getPlayerStats(user);

    // PAGINATION
    if (isPrev || isNext) {
      const page = parseInt(pageStr, 10);
      const newPage = isPrev ? page - 1 : page + 1;
      let available = CRAFTING_RECIPES.filter(
        (r) =>
          r.ingredients.every(
            (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
          ) && user.level >= (r.requiredLevel ?? 0),
      );
      available = available.filter(CATEGORY_FILTERS[cat] || CATEGORY_FILTERS.all);
      const start = newPage * 25;
      const pageItems = available.slice(start, start + 25);
      const total = Math.ceil(available.length / 25);

      const select = new StringSelectMenuBuilder()
        .setCustomId(`craft_${userId}_${newPage}_${cat}`)
        .setPlaceholder(`Choose recipe — Page ${newPage + 1}/${total}`)
        .addOptions(
          pageItems.map((r) => ({
            label: r.name.slice(0, 100),
            value: r.id,
            emoji: r.emoji,
            description: r.ingredients
              .map((i) => `${i.qty}x ${i.id}`)
              .join(', ')
              .slice(0, 100),
          })),
        );

      const components: any[] = [new ActionRowBuilder().addComponents(select)];
      if (available.length > 25) {
        const prev = new ButtonBuilder()
          .setCustomId(`craftprev_${userId}_${newPage}_${cat}`)
          .setLabel('◀ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0);
        const next = new ButtonBuilder()
          .setCustomId(`craftnext_${userId}_${newPage}_${cat}`)
          .setLabel('Next ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(start + 25 >= available.length);
        components.push(new ActionRowBuilder().addComponents(prev, next));
      }
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('🔨 Nova Forge')
        .setDescription(
          `❤️ HP: ${stats.hp}/${stats.maxHp}\n⚡ Stamina: ${user.stamina}/${user.maxStamina}`,
        );
      return interaction.editReply({ embeds: [embed], components });
    }

    // CRAFTING
    const recipeId = (interaction as StringSelectMenuInteraction).values[0];
    const recipe = getCraftingRecipe(recipeId);
    if (!recipe) return;

    if ((user.stamina ?? 0) < ACTION_COST.craft) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`⚡ Need ${ACTION_COST.craft} stamina`),
        ],
        components: [],
      });
    }
    const has = recipe.ingredients.every(
      (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
    );
    if (!has)
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('📦 Missing materials')],
        components: [],
      });

    // consume
    for (const ing of recipe.ingredients) {
      const it = user.items.find((i) => i.itemId === ing.id)!;
      it.qty -= ing.qty;
    }
    user.items = user.items.filter((i) => i.qty > 0);
    user.stamina -= ACTION_COST.craft;

    // add result to inventory + ensure Item DB has stats
    const result = recipe.result;
    const equipData = EQUIPMENTS[result.itemId as keyof typeof EQUIPMENTS];
    if (equipData) {
      await this.container.db.item.updateOne(
        { itemId: result.itemId },
        { $set: equipData },
        { upsert: true },
      );
    }
    const inv = user.items.find((i) => i.itemId === result.itemId);
    if (inv) inv.qty += result.qty;
    else user.items.push({ itemId: result.itemId, qty: result.qty });

    await user.save();

    const embed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Crafted!')
      .setDescription(
        `${recipe.emoji} **${recipe.name}** crafted successfully!\n\n📦 Added to inventory`,
      )
      .addFields({
        name: 'Stamina',
        value: `${user.stamina + ACTION_COST.craft} → ${user.stamina}`,
        inline: true,
      });

    return interaction.editReply({ embeds: [embed], components: [] });
  }
}
