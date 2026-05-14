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
import { getRecipe, RECIPES } from '../lib/rpg/recipes';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { ACTION_COST } from '../lib/rpg/actions';

const TIER_FILTERS: Record<string, (recipe: any) => boolean> = {
  basic: (r) => r.heal <= 35,
  mid: (r) => r.heal > 35 && r.heal <= 70,
  late: (r) => r.heal > 70 && r.heal <= 150,
  end: (r) => r.heal > 150,
  dungeon: (r) => ['slime_jelly', 'void_soup', 'drake_flame_grill'].includes(r.id),
  all: () => true,
};

@ApplyOptions<InteractionHandler.Options>({
  name: 'cookSelect',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class CookSelectHandler extends InteractionHandler {
  public override parse(interaction) {
    const isCookSelect =
      interaction.isStringSelectMenu() && interaction.customId.startsWith('cook_');
    const isCookButton = interaction.isButton() && interaction.customId.startsWith('cook');
    return isCookSelect || isCookButton ? this.some() : this.none();
  }

  public async run(interaction: StringSelectMenuInteraction | ButtonInteraction) {
    const [, userId, pageStr, tier = 'all'] = interaction.customId.split('_');
    const isPrevButton = interaction.customId.startsWith('cookprev');
    const isNextButton = interaction.customId.startsWith('cooknext');

    // security: only owner can use
    if (interaction.user.id !== userId) {
      return interaction.reply({ content: 'Ini bukan kompor kamu 😅', ephemeral: true });
    }

    await interaction.deferUpdate();

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    // ===== PAGINATION =====
    if (isPrevButton || isNextButton) {
      const currentPage = parseInt(pageStr, 10);
      const newPage = isPrevButton ? currentPage - 1 : currentPage + 1;

      // get available recipes
      let availableRecipes = RECIPES.filter((recipe) =>
        recipe.ingredients.every(
          (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
        ),
      );
      availableRecipes = availableRecipes.filter(TIER_FILTERS[tier] || TIER_FILTERS.all);

      const startIndex = newPage * 25;
      const pageRecipes = availableRecipes.slice(startIndex, startIndex + 25);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`cook_${userId}_${newPage}_${tier}`)
        .setPlaceholder(`Halaman ${newPage + 1} / ${Math.ceil(availableRecipes.length / 25)}`)
        .addOptions(
          pageRecipes.map((recipe) => ({
            label:
              `${recipe.name} (+${recipe.heal} HP)${recipe.buff ? ` [${recipe.buff.type.toUpperCase()}+${recipe.buff.value}]` : ''}`.slice(
                0,
                100,
              ),
            value: recipe.id,
            emoji: recipe.emoji,
            description: recipe.ingredients
              .map((i) => `${i.qty}x ${i.id}`)
              .join(', ')
              .slice(0, 100),
          })),
        );

      const components: ActionRowBuilder<any>[] = [
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
      ];

      if (availableRecipes.length > 25) {
        const prevButton = new ButtonBuilder()
          .setCustomId(`cookprev_${userId}_${newPage}_${tier}`)
          .setLabel('◀ Sebelumnya')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0);

        const nextButton = new ButtonBuilder()
          .setCustomId(`cooknext_${userId}_${newPage}_${tier}`)
          .setLabel('Selanjutnya ▶')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(startIndex + 25 >= availableRecipes.length);

        components.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton),
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle('🍳 Dapur Nova')
        .setDescription(
          `HP: **${user.hp}/${user.maxHp}** • Stamina cost: **-${ACTION_COST.cook}**`,
        );

      return interaction.editReply({ embeds: [embed], components });
    }

    // ===== COOKING =====
    const selectedRecipeId = (interaction as StringSelectMenuInteraction).values[0];
    const recipe = getRecipe(selectedRecipeId);
    if (!recipe) return;

    if ((user.stamina ?? 0) < ACTION_COST.cook) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setDescription(`⚡ Stamina kurang! Butuh ${ACTION_COST.cook}.`),
        ],
        components: [],
      });
    }

    const hasIngredients = recipe.ingredients.every(
      (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
    );
    if (!hasIngredients) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription('📦 Bahan tidak cukup!')],
        components: [],
      });
    }

    // consume ingredients
    for (const ing of recipe.ingredients) {
      const item = user.items.find((i) => i.itemId === ing.id)!;
      item.qty -= ing.qty;
    }
    user.items = user.items.filter((i) => i.qty > 0);
    user.stamina -= ACTION_COST.cook;

    const hpBefore = user.hp;
    user.hp = Math.min(user.maxHp ?? 100, hpBefore + recipe.heal);
    const hpHealed = user.hp - hpBefore;

    let buffText = '';
    if (recipe.buff) {
      user.buffs = (user.buffs || []).filter(
        (b) => new Date(b.expires) > new Date() && b.type !== recipe.buff!.type,
      );
      user.buffs.push({
        type: recipe.buff.type,
        value: recipe.buff.value,
        expires: new Date(Date.now() + recipe.buff.duration),
      });
      const minutes = Math.floor(recipe.buff.duration / 60000);
      const durationText =
        minutes >= 60 ? `${Math.floor(minutes / 60)}j ${minutes % 60}m` : `${minutes}m`;
      buffText = `✨ **${recipe.buff.type.toUpperCase()} +${recipe.buff.value}** (${durationText})`;
    }

    await user.save();

    const resultEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle('✅ Masakan Selesai')
      .setDescription(`${recipe.emoji} **${recipe.name}** berhasil dimasak!${buffText}`)
      .addFields(
        {
          name: '❤️ HP',
          value:
            hpHealed > 0 ? `${hpBefore} → ${user.hp} (+${hpHealed})` : `${user.hp}/${user.maxHp}`,
          inline: true,
        },
        {
          name: '⚡ Stamina',
          value: `${user.stamina + ACTION_COST.cook} → ${user.stamina}`,
          inline: true,
        },
      );

    return interaction.editReply({ embeds: [resultEmbed], components: [] });
  }
}
