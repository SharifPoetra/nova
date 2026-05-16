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
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RECIPES } from '../../lib/rpg/recipes';
import { ACTION_COST } from '../../lib/rpg/actions';

const TIER_FILTERS: Record<string, (recipe: any) => boolean> = {
  basic: (r) => r.heal <= 35,
  mid: (r) => r.heal > 35 && r.heal <= 70,
  late: (r) => r.heal > 70 && r.heal <= 150,
  end: (r) => r.heal > 150,
  dungeon: (r) => ['slime_jelly', 'void_soup', 'drake_flame_grill'].includes(r.id),
};

@ApplyOptions<Command.Options>({
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
              {
                name: 'Basic (≤35 HP)',
                value: 'basic',
                name_localizations: { id: 'Basic (≤35 HP)' },
              },
              { name: 'Mid (36-70 HP)', value: 'mid' },
              { name: 'Late (71-150 HP)', value: 'late' },
              { name: 'End Game (>150 HP)', value: 'end' },
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
    if (!user)
      return interaction.editReply(t('common:need_start', { defaultValue: 'Use /start first!' }));

    applyPassiveRegen(user);
    await user.save();

    const selectedTier = interaction.options.getString('tier');
    const selectedRecipeId =
      interaction.options.getString('recipe') ?? interaction.options.getString('resep');

    if (selectedRecipeId) {
      return this.cookDirectly(interaction, selectedRecipeId);
    }

    let availableRecipes = RECIPES.filter((recipe) =>
      recipe.ingredients.every(
        (ingredient) =>
          (user.items.find((i) => i.itemId === ingredient.id)?.qty || 0) >= ingredient.qty,
      ),
    );

    if (selectedTier) {
      availableRecipes = availableRecipes.filter(TIER_FILTERS[selectedTier]);
    }

    if (!availableRecipes.length) {
      return interaction.editReply(
        t('commands/cook:no_ingredients', {
          defaultValue: '📦 No ingredients! Try /explore, /hunt, or /fish.',
        }),
      );
    }

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
    const startIndex = page * 25;
    const pageRecipes = recipeList.slice(startIndex, startIndex + 25);
    const totalPages = Math.ceil(recipeList.length / 25);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cook_${interaction.user.id}_${page}_${tier}`)
      .setPlaceholder(
        t('commands/cook:select_placeholder', {
          page: page + 1,
          total: totalPages,
          defaultValue: `Choose recipe — Page ${page + 1}/${totalPages}`,
        }),
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
            .map((ing: any) => `${ing.qty}x ${ing.id}`)
            .join(', ')
            .slice(0, 100),
        })),
      );

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

      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle(t('commands/cook:title', { defaultValue: '🍳 Nova Kitchen' }))
      .setDescription(
        `${t('commands/cook:hp', { defaultValue: '❤️ HP' })}: ${user.hp}/${user.maxHp}\n` +
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
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.respond([]);

    const query = interaction.options.getFocused().toLowerCase();

    const availableRecipes = RECIPES.filter((recipe) => {
      const hasIngredients = recipe.ingredients.every(
        (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
      );
      const matchesQuery = recipe.name.toLowerCase().includes(query) || recipe.id.includes(query);
      return hasIngredients && matchesQuery;
    }).slice(0, 25);

    return interaction.respond(
      availableRecipes.map((recipe) => ({
        name: `${recipe.emoji} ${recipe.name} (+${recipe.heal} HP)`,
        value: recipe.id,
      })),
    );
  }
}
