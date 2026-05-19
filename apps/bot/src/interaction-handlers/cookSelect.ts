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
import { getRecipe, RECIPES, COOKED_ITEMS } from '../lib/rpg/cooking-recipes';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { ACTION_COST } from '../lib/rpg/actions';
import { getPlayerStats } from '../lib/rpg/combat';
import { addItemToInventory, removeItemFromInventory } from '../lib/rpg/inventory';

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
    [
      'cooked_salmon',
      'cooked_tuna',
      'spicy_stew',
      'herbal_tea',
      'silk_pie',
      'crispy_harpy',
      'slime_jelly',
    ].includes(r.resultItemId),
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
  all: () => true,
};

@ApplyOptions({
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

    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/cook:not_yours', { defaultValue: 'This is not your stove 😅' }),
        ephemeral: true,
      });

    await interaction.deferUpdate();
    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);
    const stats = await getPlayerStats(user);

    // PAGINATION
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
          pageRecipes.map((recipe) => {
            const item = COOKED_ITEMS.find((i) => i.itemId === recipe.resultItemId);
            const heal = item?.effects?.find((e) => e.type === 'heal')?.value || 0;
            const buff = item?.effects?.find((e) => e.type === 'buff');
            return {
              label: `${recipe.name} (+${heal} HP)${buff ? ` [+${buff.value}]` : ''}`.slice(0, 100),
              value: recipe.id,
              emoji: recipe.emoji,
              description: recipe.ingredients
                .map((i) => `${i.qty}x ${i.id}`)
                .join(', ')
                .slice(0, 100),
            };
          }),
        );

      const components: ActionRowBuilder<any>[] = [new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)];
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
        components.push(new ActionRowBuilder().addComponents(prevButton, nextButton));
      }

      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setTitle(t('commands/cook:title', { defaultValue: '🍳 Nova Kitchen' }))
        .setDescription(
          `${t('commands/cook:hp')}: ${stats.hp}/${stats.maxHp}\n${t('commands/cook:stamina')}: ${user.stamina}/${user.maxStamina}\n${t('commands/cook:cost', { cost: ACTION_COST.cook })}`,
        )
        .setFooter({
          text:
            tier !== 'all'
              ? t('commands/cook:filter', { tier: tier.toUpperCase() })
              : t('commands/cook:all'),
        });
      return interaction.editReply({ embeds: [embed], components });
    }

    // COOKING
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
    if (!hasIngredients)
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor(0xe74c3c).setDescription(t('commands/cook:missing'))],
        components: [],
      });

    // Hapus bahan
    for (const ing of recipe.ingredients) {
      await removeItemFromInventory(userId, ing.id, ing.qty);
    }

    user.stamina -= ACTION_COST.cook;
    user.exp += recipe.exp || 0;

    // Tambah hasil masak — AUTO UPSERT ke DB
    const cookedData = COOKED_ITEMS.find((i) => i.itemId === recipe.resultItemId)!;
    await addItemToInventory(userId, cookedData, 1);

    await user.save();

    const heal = cookedData.effects?.find((e) => e.type === 'heal')?.value || 0;
    const buff = cookedData.effects?.find((e) => e.type === 'buff');

    const resultEmbed = new EmbedBuilder()
      .setColor(0x2ecc71)
      .setTitle(t('commands/cook:success_title', { name: recipe.name }))
      .setDescription(
        `${recipe.emoji} **${recipe.name}** ${t('commands/cook:success_desc', { defaultValue: 'cooked successfully!' })}\n\n📦 Added to inventory: ${cookedData.emoji} ${cookedData.name}${buff ? `\n✨ Buff: +${buff.value}` : ''}`,
      )
      .addFields(
        {
          name: t('commands/cook:hp'),
          value: `${stats.hp}/${stats.maxHp} (+${heal} when used)`,
          inline: true,
        },
        {
          name: t('commands/cook:stamina'),
          value: `${user.stamina + ACTION_COST.cook} → ${user.stamina}`,
          inline: true,
        },
        {
          name: '✨ EXP',
          value: `+${recipe.exp || 0}`,
          inline: true,
        }
      );

    return interaction.editReply({ embeds: [resultEmbed], components: [] });
  }
}
