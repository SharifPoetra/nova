import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js';
import { FISHES } from '../../lib/rpg/fishes';
import { EXPLORES } from '../../lib/rpg/explorations';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/constants';

@ApplyOptions<Command.Options>({
  name: 'droprate',
  description: 'Lihat persentase drop untuk fish, explore, dan hunt',
  fullCategory: ['RPG'],
})
export class DroprateCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b.setName(this.name)
       .setDescription(this.description)
       .addStringOption(o =>
          o.setName('tipe')
           .setDescription('Pilih tabel')
           .setRequired(true)
           .addChoices(
              { name: 'Fish', value: 'fish' },
              { name: 'Explore', value: 'explore' },
              { name: 'Hunt', value: 'hunt' },
            )
        )
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const tipe = interaction.options.getString('tipe', true);

    if (tipe === 'fish') {
      const total = FISHES.reduce((a, f) => a + f.chance, 0);
      const byRarity = Object.groupBy(FISHES, f => f.rarity);

      const desc = FISHES.map(f =>
        `${f.emoji} ${f.name} — \`${f.chance}%\` ${RARITY_EMOJI[f.rarity]}`
      ).join('\n');

      const summary = Object.entries(byRarity)
       .map(([r, arr]) => {
          const sum = arr!.reduce((a, b) => a + b.chance, 0);
          return `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r}: **${sum}%**`;
        }).join(' • ');

      const embed = new EmbedBuilder()
       .setColor(RARITY_COLOR.Rare)
       .setTitle('🎣 Drop Rate — Fish')
       .setDescription(desc)
       .setFooter({ text: `${summary} | Total: ${total}%` });
      return interaction.reply({ embeds: [embed] });
    }

    if (tipe === 'explore') {
      const total = EXPLORES.reduce((a, e) => a + e.chance, 0);
      const byRarity = Object.groupBy(EXPLORES, e => e.rarity);

      const desc = EXPLORES.map(e =>
        `${e.emoji} ${e.text} — \`${e.chance}%\` ${RARITY_EMOJI[e.rarity]}`
      ).join('\n');

      const summary = Object.entries(byRarity)
       .map(([r, arr]) => {
          const sum = arr!.reduce((a, b) => a + b.chance, 0);
          return `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r}: ${sum}%`;
        }).join(' • ');

      const embed = new EmbedBuilder()
       .setColor(RARITY_COLOR.Epic)
       .setTitle('🗺️ Drop Rate — Explore')
       .setDescription(desc)
       .setFooter({ text: `${summary} | Total: ${total}%` });
      return interaction.reply({ embeds: [embed] });
    }

    if (tipe === 'hunt') {
      const desc = BASE_MONSTERS.map(m => {
        const drops = m.drops.map(d =>
          `${d.emoji} ${d.name} \`${d.chance}%\` ${RARITY_EMOJI[d.rarity]}`
        ).join(', ');
        return `${m.emoji} **${m.name}** (Lv.${m.minLevel}+)\n> ${drops}`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
       .setColor(RARITY_COLOR.Legendary)
       .setTitle('⚔️ Drop Rate — Hunt')
       .setDescription(desc)
       .setFooter({ text: 'Chance per monster, roll independen' });
      return interaction.reply({ embeds: [embed] });
    }
  }
}
