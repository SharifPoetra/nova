import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { getItemDisplay } from '../../lib/rpg/item-registry';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RECIPES, COOKED_ITEMS } from '../../lib/rpg/cooking-recipes';
import { ACTION_COST } from '../../lib/rpg/actions';
import { getPlayerStats } from '../../lib/rpg/combat';

const TIER_FILTERS: Record<string, (r: any) => boolean> = {
  basic: (r) =>
    [
      'cooked_sardine',
      'cooked_mackerel',
      'cooked_tilapia',
      'cooked_meat',
      'hide_soup',
      'cooked_wolf',
      'cooked_lizard',
      'warm_honey',
      'bark_tea',
      'mushroom_soup',
    ].includes(r.resultItemId),
  mid: (r) =>
    ['cooked_salmon', 'cooked_tuna', 'spicy_stew', 'herbal_tea', 'silk_pie', 'crispy_harpy', 'slime_jelly'].includes(
      r.resultItemId,
    ),
  late: (r) =>
    [
      'cooked_bear',
      'ginseng_brew',
      'mana_potion',
      'venom_soup',
      'berserk_stew',
      'shadow_curry',
      'lava_jelly',
      'troll_ragout',
      'worm_sushi',
    ].includes(r.resultItemId),
  end: (r) =>
    [
      'moon_elixir',
      'golden_omelette',
      'knight_feast',
      'storm_broth',
      'crystal_soup',
      'hydra_gumbo',
      'phoenix_rebirth',
      'void_soup',
      'drake_grill',
    ].includes(r.resultItemId),
  dungeon: (r) => ['slime_jelly', 'void_soup', 'drake_grill'].includes(r.resultItemId),
};

@ApplyOptions({
  name: 'cook',
  description: 'Cook food to heal or buff',
  fullCategory: ['RPG'],
})
export class CookCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:cook', 'commands/descriptions:cook')
        .addStringOption((option) =>
          option
            .setName('tier')
            .setDescription('Filter by tier')
            .setDescriptionLocalizations({
              id: 'Filter berdasarkan tier',
              'en-US': 'Filter by tier',
            })
            .addChoices(
              { name: 'Basic', value: 'basic', name_localizations: { id: 'Basic' } },
              { name: 'Mid', value: 'mid' },
              { name: 'Late', value: 'late' },
              { name: 'End Game', value: 'end' },
              { name: 'Dungeon', value: 'dungeon' },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('recipe')
            .setNameLocalizations({ id: 'resep' })
            .setDescription('Type recipe name')
            .setDescriptionLocalizations({ id: 'Ketik nama resep', 'en-US': 'Type recipe name' })
            .setAutocomplete(true),
        ),
    );
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply(t('common:need_start', { defaultValue: 'Use /start first!' }));

    applyPassiveRegen(user);
    await user.save();

    const selectedTier = interaction.options.getString('tier');
    const selectedRecipeId = interaction.options.getString('recipe') ?? interaction.options.getString('resep');
    if (selectedRecipeId) return this.cookDirectly(interaction, selectedRecipeId);

    const invMap = new Map(user.items.map((i) => [i.itemId, i.qty]));

    let availableRecipes = RECIPES.filter((recipe) =>
      recipe.ingredients.every((ingredient) => (invMap.get(ingredient.id) ?? 0) >= ingredient.qty),
    );
    if (selectedTier) availableRecipes = availableRecipes.filter(TIER_FILTERS[selectedTier]);
    if (!availableRecipes.length)
      return interaction.editReply(
        t('commands/cook:no_ingredients', {
          defaultValue: '📦 No ingredients! Try /explore, /hunt, or /fish.',
        }),
      );

    return this.sendRecipePage(interaction, user, availableRecipes, 0, selectedTier || 'all');
  }

  private async sendRecipePage(
    interaction: ChatInputCommandInteraction,
    user: any,
    recipeList: any[],
    page: number,
    tier: string,
  ) {
    const t = await fetchT(interaction);
    const stats = await getPlayerStats(user);
    const startIndex = page * 25;
    const pageRecipes = recipeList.slice(startIndex, startIndex + 25);
    const totalPages = Math.ceil(recipeList.length / 25);

    const options = await Promise.all(
      pageRecipes.map(async (recipe) => {
        const item = COOKED_ITEMS.find((i) => i.itemId === recipe.resultItemId);
        const heal = item?.effects?.find((e) => e.type === 'heal')?.value || 0;
        const buff = item?.effects?.find((e) => e.type === 'buff');
        // pakai i18n untuk nama resep
        const recipeName = t(`cook/recipes:${recipe.id}.name`, { defaultValue: recipe.name });

        const ingNames = await Promise.all(
          recipe.ingredients.map(async (ing: any) => {
            const disp = await getItemDisplay(ing.id, t);
            return `${ing.qty}x ${disp?.name ?? ing.id}`;
          }),
        );

        return {
          label: `${recipeName} (+${heal} HP)${buff ? ` [+${buff.value}]` : ''}`.slice(0, 100),
          value: recipe.id,
          emoji: recipe.emoji,
          description: ingNames.join(', ').slice(0, 100),
        };
      }),
    );

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cook_${interaction.user.id}_${page}_${tier}`)
      .setPlaceholder(
        t('commands/cook:select_placeholder', {
          page: page + 1,
          total: totalPages,
          defaultValue: `Choose recipe — Page ${page + 1}/${totalPages}`,
        }),
      )
      .addOptions(options);

    const components: ActionRowBuilder<any>[] = [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
    ];
    if (recipeList.length > 25) {
      const prevButton = new ButtonBuilder()
        .setCustomId(`cookprev_${interaction.user.id}_${page}_${tier}`)
        .setLabel(t('commands/cook:prev', { defaultValue: '◀ Previous' }))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);
      const nextButton = new ButtonBuilder()
        .setCustomId(`cooknext_${interaction.user.id}_${page}_${tier}`)
        .setLabel(t('commands/cook:next', { defaultValue: 'Next ▶' }))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(startIndex + 25 >= recipeList.length);
      components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(t('commands/cook:title', { defaultValue: '🍳 Nova Kitchen' }))
      .setDescription(
        `${t('commands/cook:hp', { defaultValue: '❤️ HP' })}: ${stats.hp}/${stats.maxHp}\n` +
          `${t('commands/cook:stamina', { defaultValue: '⚡ Stamina' })}: ${user.stamina}/${user.maxStamina}\n` +
          `${t('commands/cook:cost', { cost: ACTION_COST.cook, defaultValue: `💰 Cost: -${ACTION_COST.cook} stamina` })}`,
      )
      .setFooter({
        text:
          tier !== 'all'
            ? t('commands/cook:filter', {
                tier: tier.toUpperCase(),
                defaultValue: `Filter: ${tier.toUpperCase()}`,
              })
            : t('commands/cook:all', { defaultValue: 'All cookable recipes' }),
      });

    return interaction.editReply({ embeds: [embed], components });
  }

  private async cookDirectly(interaction: ChatInputCommandInteraction, recipeId: string) {
    const handler = this.container.stores.get('interaction-handlers').get('cookSelect');
    const fakeInteraction = {
      customId: `cook_${interaction.user.id}_0_all`,
      values: [recipeId],
      user: interaction.user,
      deferUpdate: async () => {},
      editReply: (options: any) => interaction.editReply(options),
      isStringSelectMenu: () => true,
      locale: interaction.locale,
      guildLocale: interaction.guildLocale,
    } as any;
    return handler?.run(fakeInteraction);
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction) {
    const t = await fetchT(interaction);
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.respond([]);
    const query = interaction.options.getFocused().toLowerCase();

    const invMap = new Map(user.items.map((i) => [i.itemId, i.qty]));

    const availableRecipes = RECIPES.filter((recipe) => {
      const hasIngredients = recipe.ingredients.every((ing) => (invMap.get(ing.id) ?? 0) >= ing.qty);
      const name = t(`cook/recipes:${recipe.id}.name`, { defaultValue: recipe.id }).toLowerCase();
      const matchesQuery = name.includes(query) || recipe.id.includes(query);
      return hasIngredients && matchesQuery;
    }).slice(0, 25);

    return interaction.respond(
      await Promise.all(
        availableRecipes.map(async (recipe) => {
          const item = COOKED_ITEMS.find((i) => i.itemId === recipe.resultItemId);
          const heal = item?.effects?.find((e) => e.type === 'heal')?.value || 0;
          const name = t(`cook/recipes:${recipe.id}.name`, { defaultValue: recipe.id });
          return { name: `${recipe.emoji} ${name} (+${heal} HP)`, value: recipe.id };
        }),
      ),
    );
  }
}
