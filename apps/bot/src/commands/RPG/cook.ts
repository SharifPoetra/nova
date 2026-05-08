import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ComponentType } from 'discord.js';

const RECIPES = [
  // === RESEP LAMA (tetap) ===
  {
    id: 'fish_sardine',
    heal: 20,
    name: 'Sarden Bakar',
    emoji: '🐟',
    ingredients: [{ id: 'fish_sardine', qty: 1 }],
  },
  {
    id: 'fish_mackerel',
    heal: 25,
    name: 'Kembung Goreng',
    emoji: '🐟',
    ingredients: [{ id: 'fish_mackerel', qty: 1 }],
  },
  {
    id: 'fish_tilapia',
    heal: 30,
    name: 'Nila Bakar',
    emoji: '🐠',
    ingredients: [{ id: 'fish_tilapia', qty: 1 }],
  },
  {
    id: 'fish_salmon',
    heal: 45,
    name: 'Salmon Panggang',
    emoji: '🍣',
    ingredients: [{ id: 'fish_salmon', qty: 1 }],
  },
  {
    id: 'fish_tuna',
    heal: 40,
    name: 'Tuna Steak',
    emoji: '🐟',
    ingredients: [{ id: 'fish_tuna', qty: 1 }],
  },
  {
    id: 'meat',
    heal: 30,
    name: 'Steak Daging',
    emoji: '🥩',
    ingredients: [{ id: 'meat', qty: 1 }],
  },
  { id: 'hide', heal: 15, name: 'Sup Kulit', emoji: '🦌', ingredients: [{ id: 'hide', qty: 1 }] },
  {
    id: 'wolf_meat',
    heal: 35,
    name: 'Steak Serigala',
    emoji: '🍖',
    ingredients: [{ id: 'wolf_meat', qty: 1 }],
  },
  {
    id: 'bear_meat',
    heal: 70,
    name: 'Bear Steak',
    emoji: '🥩',
    ingredients: [{ id: 'bear_meat', qty: 1 }],
  },
  {
    id: 'lizard_meat',
    heal: 25,
    name: 'Sate Kadal',
    emoji: '🍗',
    ingredients: [{ id: 'lizard_meat', qty: 1 }],
  },
  {
    id: 'honey',
    heal: 40,
    name: 'Madu Hangat',
    emoji: '🍯',
    ingredients: [{ id: 'honey', qty: 1 }],
  },

  // === RESEP BARU BUFF ===
  {
    id: 'spicy_stew',
    heal: 40,
    name: 'Spicy Stew',
    emoji: '🌶️',
    ingredients: [
      { id: 'meat', qty: 2 },
      { id: 'chili', qty: 1 },
    ],
    buff: { type: 'atk', value: 5, duration: 3600000 }, // 1 jam
  },
  {
    id: 'herbal_tea',
    heal: 25,
    name: 'Herbal Tea',
    emoji: '🍵',
    ingredients: [
      { id: 'herb', qty: 1 },
      { id: 'honey', qty: 1 },
    ],
    buff: { type: 'stamina_regen', value: 2, duration: 1800000 }, // 30 menit
  },
];

@ApplyOptions<Command.Options>({
  name: 'cook',
  description: 'Masak untuk heal atau buff',
  fullCategory: ['RPG'],
})
export class CookCommand extends Command {
  public override registerApplicationCommands(r: Command.Registry) {
    r.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;
    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    const available = RECIPES.filter((r) =>
      r.ingredients.every(
        (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
      ),
    );

    if (!available.length)
      return interaction.editReply(
        '📦 Tidak ada bahan! `/explore` untuk cabai/herb, `/hunt` untuk daging.',
      );

    const options = available.map((r) => ({
      label: `${r.name} (+${r.heal} HP)${r.buff ? ` [${r.buff.type.toUpperCase()}+${r.buff.value}]` : ''}`,
      value: r.id,
      emoji: r.emoji,
      description: r.ingredients.map((i) => `${i.qty}x ${i.id}`).join(', '),
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId('cook_select')
      .setPlaceholder('Pilih masakan...')
      .addOptions(options.slice(0, 25));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🍳 Dapur Nova')
      .setDescription(`HP: **${user.hp}/${user.maxHp}**\nPilih resep:`);
    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 30000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate();
      const recipe = RECIPES.find((r) => r.id === i.values[0])!;

      // consume
      for (const ing of recipe.ingredients) {
        const it = user.items.find((x) => x.itemId === ing.id)!;
        it.qty -= ing.qty;
      }
      user.items = user.items.filter((x) => x.qty > 0);

      const before = user.hp;
      user.hp = Math.min(user.maxHp, before + recipe.heal);

      let buffText = '';
      if (recipe.buff) {
        user.buffs = user.buffs || [];
        user.buffs = user.buffs.filter((b) => new Date(b.expires) > new Date()); // clean
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
        .setTitle('✅ Selesai')
        .setDescription(`${recipe.emoji} **${recipe.name}** dimasak!${buffText}`)
        .addFields({ name: '❤️ HP', value: `${before} → ${user.hp}`, inline: true });
      await interaction.editReply({ embeds: [result], components: [] });
      collector.stop();
    });
  }
}
