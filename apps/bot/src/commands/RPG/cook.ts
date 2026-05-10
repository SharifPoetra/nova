import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } from 'discord.js';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RECIPES } from '../../lib/rpg/recipes';
import { ACTION_COST } from '../../lib/rpg/actions';

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
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    applyPassiveRegen(user);
    await user.save();

    const available = RECIPES.filter((r) =>
      r.ingredients.every(
        (ing) => (user.items.find((i) => i.itemId === ing.id)?.qty || 0) >= ing.qty,
      ),
    );

    if (!available.length) {
      return interaction.editReply(
        '📦 Tidak ada bahan! `/explore` untuk cabai/herb, `/hunt` untuk daging, `/fish` untuk ikan.',
      );
    }

    const options = available.slice(0, 25).map((r) => ({
      label:
        `${r.name} (+${r.heal} HP)${r.buff ? ` [${r.buff.type.toUpperCase()}+${r.buff.value}]` : ''}`.slice(
          0,
          100,
        ),
      value: r.id,
      emoji: r.emoji,
      description: r.ingredients
        .map((i) => `${i.qty}x ${i.id}`)
        .join(', ')
        .slice(0, 100),
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`cook_${interaction.user.id}`) // CHANGED: pakai userId
      .setPlaceholder('Pilih masakan...')
      .addOptions(options);

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const embed = new EmbedBuilder()
      .setColor(0xf39c12)
      .setTitle('🍳 Dapur Nova')
      .setDescription(
        `HP: **${user.hp}/${user.maxHp}**\nPilih resep (stamina -${ACTION_COST.cook} saat masak):`,
      );

    const msg = await interaction.editReply({ embeds: [embed], components: [row] });

    setTimeout(async () => {
      try {
        const fresh = await interaction.fetchReply();
        if (fresh.components?.length) {
          await interaction.editReply({
            components: [],
            embeds: [
              EmbedBuilder.from(embed)
                .setColor(0x95a5a6)
                .setFooter({ text: '⏰ Waktu habis (2 menit) — ketik /cook lagi' }),
            ],
          });
        }
      } catch {
        /* ignore */
      }
    }, 120_000); // 2 menit

    return msg;
  }
}
