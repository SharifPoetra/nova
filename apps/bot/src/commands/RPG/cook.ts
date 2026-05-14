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
  description: 'Masak untuk heal atau buff',
  fullCategory: ['RPG'],
  detailedDescription: {
    usage: '/cook [tier] [resep]',
    examples: ['/cook', '/cook tier:late', '/cook resep:Hydra'],
    extendedHelp: `
Cost 5 stamina per masak • Tidak ada cooldown.

**Cara pakai:**
• /cook → buka menu dengan pagination (25 resep per halaman)
• /cook tier:basic|mid|late|end|dungeon → filter langsung
• /cook resep:[ketik] → autocomplete, masak instan

**Tier:**
• Basic (≤35 HP): Sarden Bakar, Nila Bakar, Steak Daging
• Mid (36-70 HP): Spicy Stew, Herbal Tea, Salmon Panggang, Bear Steak
• Late (71-150 HP): Tuna Special, Ginseng Brew, Wolf Pack Stew
• End (>150 HP): Hydra Gumbo, Phoenix Rebirth, Drake Flame Grill
• Dungeon: Slime Jelly, Void Soup

**Buff tidak stack.** Masak sebelum /hunt atau /dungeon untuk ATK/DEF/regen.
Bahan didapat dari /hunt (daging), /fish (ikan), /explore (herb/chili/madu).
`.trim(),
  },
})
export class CookCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('tier')
            .setDescription('Filter berdasarkan tier')
            .addChoices(
              { name: 'Basic (≤35 HP)', value: 'basic' },
              { name: 'Mid (36-70 HP)', value: 'mid' },
              { name: 'Late (71-150 HP)', value: 'late' },
              { name: 'End Game (>150 HP)', value: 'end' },
              { name: 'Dungeon', value: 'dungeon' },
            ),
        )
        .addStringOption((option) =>
          option.setName('resep').setDescription('Ketik nama resep').setAutocomplete(true),
        ),
    );
  }

  public async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    applyPassiveRegen(user);
    await user.save();

    const selectedTier = interaction.options.getString('tier');
    const selectedRecipeId = interaction.options.getString('resep');

    // Direct cook via autocomplete
    if (selectedRecipeId) {
      return this.cookDirectly(interaction, selectedRecipeId);
    }

    // Get available recipes based on inventory
    let availableRecipes = RECIPES.filter((recipe) =>
      recipe.ingredients.every(
        (ingredient) =>
          (user.items.find((i) => i.itemId === ingredient.id)?.qty || 0) >= ingredient.qty,
      ),
    );

    // Apply tier filter if specified
    if (selectedTier) {
      availableRecipes = availableRecipes.filter(TIER_FILTERS[selectedTier]);
    }

    if (!availableRecipes.length) {
      return interaction.editReply(
        '📦 Tidak ada bahan untuk resep ini! Coba `/explore`, `/hunt`, atau `/fish` dulu.',
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
    const startIndex = page * 25;
    const pageRecipes = recipeList.slice(startIndex, startIndex + 25);
    const totalPages = Math.ceil(recipeList.length / 25);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`cook_${interaction.user.id}_${page}_${tier}`)
      .setPlaceholder(`Pilih resep — Halaman ${page + 1} / ${totalPages}`)
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

    // Add pagination buttons if needed
    if (recipeList.length > 25) {
      const prevButton = new ButtonBuilder()
        .setCustomId(`cookprev_${interaction.user.id}_${page}_${tier}`)
        .setLabel('◀ Sebelumnya')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);

      const nextButton = new ButtonBuilder()
        .setCustomId(`cooknext_${interaction.user.id}_${page}_${tier}`)
        .setLabel('Selanjutnya ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(startIndex + 25 >= recipeList.length);

      components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(prevButton, nextButton));
    }

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🍳 Dapur Nova')
      .setDescription(
        `❤️ **HP:** ${user.hp}/${user.maxHp}` +
          `⚡ **Stamina:** ${user.stamina}/${user.maxStamina}` +
          `💰 **Cost:** -${ACTION_COST.cook} stamina per masak`,
      )
      .setFooter({
        text: tier !== 'all' ? `Filter: ${tier.toUpperCase()}` : 'Semua resep yang bisa dimasak',
      });

    return interaction.editReply({ embeds: [embed], components });
  }

  private async cookDirectly(interaction: ChatInputCommandInteraction, recipeId: string) {
    // Simulate a select menu interaction to reuse the handler
    const handler = this.container.stores.get('interaction-handlers').get('cookSelect');
    const fakeInteraction = {
      customId: `cook_${interaction.user.id}_0_all`,
      values: [recipeId],
      user: interaction.user,
      deferUpdate: async () => {},
      editReply: (options: any) => interaction.editReply(options),
      isStringSelectMenu: () => true,
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
