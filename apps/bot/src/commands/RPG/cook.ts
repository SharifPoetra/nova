import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ComponentType } from 'discord.js';

const RECIPES = [
  { need: 'fish_sardine', heal: 20, name: 'Sarden Bakar', emoji: '🐟' },
  { need: 'fish_mackerel', heal: 25, name: 'Kembung Goreng', emoji: '🐟' },
  { need: 'fish_tilapia', heal: 30, name: 'Nila Bakar', emoji: '🐠' },
  { need: 'fish_salmon', heal: 45, name: 'Salmon Panggang', emoji: '🍣' },
  { need: 'fish_tuna', heal: 40, name: 'Tuna Steak', emoji: '🐟' },
  { need: 'meat', heal: 30, name: 'Steak Daging', emoji: '🥩' },
  { need: 'hide', heal: 15, name: 'Sup Kulit', emoji: '🦌' },
  { need: 'wolf_meat', heal: 35, name: 'Steak Serigala', emoji: '🍖' },
  { need: 'bear_meat', heal: 70, name: 'Bear Steak', emoji: '🥩' },
  { need: 'lizard_meat', heal: 25, name: 'Sate Kadal', emoji: '🍗' },
  { need: 'honey', heal: 40, name: 'Madu Hangat', emoji: '🍯' },
];

@ApplyOptions<Command.Options>({
  name: 'cook',
  description: 'Masak ikan/daging dari inventory untuk heal',
  fullCategory: ['RPG'],
})
export class CookCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;
    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    // filter resep yang bahannya ada
    const available = RECIPES.filter((r) => {
      const it = user.items.find((i) => i.itemId === r.need);
      return it && it.qty > 0;
    });

    if (!available.length) {
      return interaction.editReply('📦 Tidak ada bahan masak! `/fish` atau `/hunt` dulu.');
    }

    const options = available.map((r) => {
      const qty = user.items.find((i) => i.itemId === r.need)?.qty ?? 0;
      return {
        label: `${r.name} (+${r.heal} HP)`,
        description: `Punya: ${qty}x`,
        value: r.need,
        emoji: r.emoji,
      };
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('cook_select')
      .setPlaceholder('Pilih yang mau dimasak...')
      .addOptions(options.slice(0, 25));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🍳 Dapur Nova')
      .setDescription(`HP kamu: **${user.hp}/${user.maxHp ?? 100}**\nPilih bahan di bawah:`);

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 30000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      await i.deferUpdate();
      const needId = i.values[0];
      const recipe = RECIPES.find((r) => r.need === needId)!;

      const item = user.items.find((it) => it.itemId === needId)!;
      item.qty -= 1;
      if (item.qty <= 0) user.items = user.items.filter((it) => it.qty > 0);

      const beforeHp = user.hp ?? 0;
      user.hp = Math.min(user.maxHp ?? 100, beforeHp + recipe.heal);
      await user.save();

      const result = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Masakan Selesai')
        .setDescription(`${recipe.emoji} **${recipe.name}** dimasak!`)
        .addFields(
          { name: '❤️ HP', value: `${beforeHp} → ${user.hp}`, inline: true },
          {
            name: '📦 Sisa bahan',
            value: `${user.items.find((it) => it.itemId === needId)?.qty ?? 0}x`,
            inline: true,
          },
        );

      await interaction.editReply({ embeds: [result], components: [] });
      collector.stop();
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') interaction.editReply({ components: [] });
    });
  }
}
