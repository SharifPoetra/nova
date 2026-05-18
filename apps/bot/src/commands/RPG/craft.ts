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
import { CRAFTING_RECIPES } from '../../lib/rpg/crafting-recipes';
import { ACTION_COST } from '../../lib/rpg/actions';
import { getPlayerStats } from '../../lib/rpg/combat';

const CATEGORY_FILTERS: Record<string, (r: any) => boolean> = {
  tool: (r) => r.category === 'tool',
  weapon: (r) => r.category === 'weapon',
  armor: (r) => r.category === 'armor',
};

@ApplyOptions({
  name: 'craft',
  description: 'Craft equipment from materials',
  fullCategory: ['RPG'],
})
export class CraftCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:craft', 'commands/descriptions:craft')
        .addStringOption((option) =>
          option
            .setName('category')
            .setDescription('Filter by category')
            .addChoices(
              { name: 'Tools (rod, pickaxe)', value: 'tool' },
              { name: 'Weapons', value: 'weapon' },
              { name: 'Armor', value: 'armor' },
            ),
        )
        .addStringOption((option) =>
          option.setName('recipe').setDescription('Type recipe name').setAutocomplete(true),
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
    const selectedCategory = interaction.options.getString('category');
    const selectedRecipeId = interaction.options.getString('recipe');

    if (selectedRecipeId) return this.craftDirectly(interaction, selectedRecipeId);

    let available = CRAFTING_RECIPES.filter(
      (r) =>
        r.ingredients.every(
          (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
        ) && user.level >= (r.requiredLevel ?? 0),
    );
    if (selectedCategory) available = available.filter(CATEGORY_FILTERS[selectedCategory]);

    if (!available.length)
      return interaction.editReply('📦 No craftable items! Get materials from /explore or /hunt');

    return this.sendPage(interaction, user, available, 0, selectedCategory || 'all');
  }

  private async sendPage(
    interaction: ChatInputCommandInteraction,
    user: any,
    list: any[],
    page: number,
    cat: string,
  ) {
    const t = await fetchT(interaction);
    const stats = await getPlayerStats(user);
    const start = page * 25;
    const pageItems = list.slice(start, start + 25);
    const total = Math.ceil(list.length / 25);

    const select = new StringSelectMenuBuilder()
      .setCustomId(`craft_${interaction.user.id}_${page}_${cat}`)
      .setPlaceholder(`Choose recipe — Page ${page + 1}/${total}`)
      .addOptions(
        pageItems.map((r) => ({
          label: `${r.name}`.slice(0, 100),
          value: r.id,
          emoji: r.emoji,
          description: r.ingredients
            .map((i: any) => `${i.qty}x ${i.id}`)
            .join(', ')
            .slice(0, 100),
        })),
      );

    const components: any[] = [new ActionRowBuilder().addComponents(select)];
    if (list.length > 25) {
      const prev = new ButtonBuilder()
        .setCustomId(`craftprev_${interaction.user.id}_${page}_${cat}`)
        .setLabel('◀ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page === 0);
      const next = new ButtonBuilder()
        .setCustomId(`craftnext_${interaction.user.id}_${page}_${cat}`)
        .setLabel('Next ▶')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(start + 25 >= list.length);
      components.push(new ActionRowBuilder().addComponents(prev, next));
    }

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🔨 Nova Forge')
      .setDescription(
        `❤️ HP: ${stats.hp}/${stats.maxHp}\n⚡ Stamina: ${user.stamina}/${user.maxStamina}\n💰 Cost: -${ACTION_COST.craft} stamina`,
      )
      .setFooter({ text: cat !== 'all' ? `Filter: ${cat.toUpperCase()}` : 'All craftable' });

    return interaction.editReply({ embeds: [embed], components });
  }

  private async craftDirectly(interaction: ChatInputCommandInteraction, recipeId: string) {
    const handler = this.container.stores.get('interaction-handlers').get('craftSelect');
    const fake = {
      customId: `craft_${interaction.user.id}_0_all`,
      values: [recipeId],
      user: interaction.user,
      deferUpdate: async () => {},
      editReply: (o: any) => interaction.editReply(o),
      isStringSelectMenu: () => true,
      locale: interaction.locale,
      guildLocale: interaction.guildLocale,
    } as any;
    return handler?.run(fake);
  }

  public override async autocompleteRun(interaction: AutocompleteInteraction) {
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.respond([]);
    const q = interaction.options.getFocused().toLowerCase();
    const available = CRAFTING_RECIPES.filter((r) => {
      const has = r.ingredients.every(
        (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
      );
      const match = r.name.toLowerCase().includes(q) || r.id.includes(q);
      return has && match && user.level >= (r.requiredLevel ?? 0);
    }).slice(0, 25);
    return interaction.respond(
      available.map((r) => ({ name: `${r.emoji} ${r.name}`, value: r.id })),
    );
  }
}
