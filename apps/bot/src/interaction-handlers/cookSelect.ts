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
    const t = await fetchT(interaction);
    const [, userId, pageStr, tier = 'all'] = interaction.customId.split('_');
    const isPrevButton = interaction.customId.startsWith('cookprev');
    const isNextButton = interaction.customId.startsWith('cooknext');

    if (interaction.user.id !== userId) {
      return interaction.reply({
        content: t('commands/cook:not_yours', { defaultValue: 'This is not your stove 😅' }),
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    // ===== PAGINATION =====
    if (isPrevButton || isNextButton) {
      const currentPage = parseInt(pageStr, 10);
      const newPage = isPrevButton ? currentPage - 1 : currentPage + 1;

      let availableRecipes = RECIPES.filter((recipe) =>
        recipe.ingredients.every(
          (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
        ),
      );
      availableRecipes = availableRecipes.filter(TIER_FILTERS[tier] || TIER_FILTERS.all);

      const startIndex = newPage * 25;
      const pageRecipes = availableRecipes.slice(startIndex, startIndex + 25);
      const totalPages = Math.ceil(availableRecipes.length / 25);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`cook_${userId}_${newPage}_${tier}`)
        .setPlaceholder(
          t('commands/cook:select_placeholder', { page: newPage + 1, total: totalPages }),
        )
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
          .setLabel(t('commands/cook:prev'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(newPage === 0);

        const nextButton = new ButtonBuilder()
          .setCustomId(`cooknext_${userId}_${newPage}_${tier}`)
          .setLabel(t('commands/cook:next'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(startIndex + 25 >= availableRecipes.length);

        components.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton),
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle(t('commands/cook:title'))
        .setDescription(
          `${t('commands/cook:hp')}: **${user.hp}/${user.maxHp}** • ${t('commands/cook:cost', { cost: ACTION_COST.cook })}`,
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
            .setDescription(
              t('commands/cook:low_stamina', { current: user.stamina, need: ACTION_COST.cook }),
            ),
        ],
        components: [],
      });
    }

    const hasIngredients = recipe.ingredients.every(
      (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
    );
    if (!hasIngredients) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription(t('commands/cook:missing'))],
        components: [],
      });
    }

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
        minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`;
      buffText = `\n✨ **${recipe.buff.type.toUpperCase()} +${recipe.buff.value}** (${durationText})`;
    }

    await user.save();

    const resultEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(t('commands/cook:success_title', { name: recipe.name }))
      .setDescription(
        `${recipe.emoji} **${recipe.name}** ${t('commands/cook:success_desc', { defaultValue: 'cooked successfully!' })}${buffText}`,
      )
      .addFields(
        {
          name: t('commands/cook:hp'),
          value:
            hpHealed > 0 ? `${hpBefore} → ${user.hp} (+${hpHealed})` : `${user.hp}/${user.maxHp}`,
          inline: true,
        },
        {
          name: t('commands/cook:stamina'),
          value: `${user.stamina + ACTION_COST.cook} → ${user.stamina}`,
          inline: true,
        },
      );

    return interaction.editReply({ embeds: [resultEmbed], components: [] });
  }
}
