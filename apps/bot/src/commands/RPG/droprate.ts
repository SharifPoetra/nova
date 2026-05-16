import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { FISHES } from '../../lib/rpg/fishes';
import { EXPLORES } from '../../lib/rpg/explorations';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';

const groupByRarity = <T extends { rarity: string }>(arr: T[]) => {
  return arr.reduce(
    (acc, cur) => {
      (acc[cur.rarity] = acc[cur.rarity] ?? []).push(cur);
      return acc;
    },
    {} as Record<string, T[]>,
  );
};

@ApplyOptions<Command.Options>({
  name: 'droprate',
  description: 'View detailed drop rates for fish, explore, and hunt',
  fullCategory: ['RPG'],
})
export class DroprateCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(
        b,
        'commands/names:droprate',
        'commands/descriptions:droprate',
      ).addStringOption((o) =>
        o
          .setName('type')
          .setNameLocalizations({ id: 'tipe' })
          .setDescription('Choose table to view')
          .setDescriptionLocalizations({ id: 'Pilih tabel', 'en-US': 'Choose table' })
          .setRequired(true)
          .addChoices(
            { name: 'Fish 🎣', value: 'fish' },
            { name: 'Explore 🗺️', value: 'explore' },
            { name: 'Hunt ⚔️', value: 'hunt' },
          ),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const tipe =
      interaction.options.getString('type', true) ?? interaction.options.getString('tipe', true)!;

    if (tipe === 'fish') {
      const total = FISHES.reduce((a, f) => a + f.chance, 0);
      const desc = FISHES.map(
        (f) =>
          `${f.emoji} **${f.name}** ${RARITY_EMOJI[f.rarity]}\n> ${t('commands/droprate:chance')}: \`${f.chance}%\` • ${t('commands/droprate:sell')}: \`${f.sellPrice}💰\` • XP: \`${f.xp}\``,
      ).join('\n\n');

      const byRarity = groupByRarity(FISHES);
      const summary = Object.entries(byRarity)
        .map(
          ([r, arr]) =>
            `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} **${r}**: ${arr.reduce((a, b) => a + b.chance, 0)}%`,
        )
        .join(' • ');

      const ev = Math.round(FISHES.reduce((a, f) => a + f.sellPrice * (f.chance / 100), 0));
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Rare)
            .setTitle(
              t('commands/droprate:fish_title', { defaultValue: '🎣 Drop Rate Detail — Fish' }),
            )
            .setDescription(desc)
            .addFields({
              name: t('commands/droprate:rarity', { defaultValue: '📊 Rarity' }),
              value: summary,
            })
            .setFooter({
              text: t('commands/droprate:fish_footer', {
                ev,
                total,
                defaultValue: `EV: ~${ev}💰 per catch • Total: ${total}%`,
              }),
            }),
        ],
      });
    }

    if (tipe === 'explore') {
      const total = EXPLORES.reduce((a, e) => a + e.chance, 0);
      const desc = EXPLORES.map((e) => {
        const item = e.item
          ? `\n> ${t('commands/droprate:drop')}: ${e.item.qty}x ${e.item.emoji} ${e.item.name}`
          : '';
        return `${e.emoji} **${e.text}** ${RARITY_EMOJI[e.rarity]}\n> ${t('commands/droprate:chance')}: \`${e.chance}%\` • +${e.coins}💰 • +${e.exp}XP${item}`;
      }).join('\n\n');

      const byRarity = groupByRarity(EXPLORES);
      const summary = Object.entries(byRarity)
        .map(
          ([r, arr]) =>
            `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r}: ${arr.reduce((a, b) => a + b.chance, 0)}%`,
        )
        .join(' • ');

      const avgC = Math.round(EXPLORES.reduce((a, e) => a + e.coins * (e.chance / 100), 0));
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Epic)
            .setTitle(
              t('commands/droprate:explore_title', {
                defaultValue: '🗺️ Drop Rate Detail — Explore',
              }),
            )
            .setDescription(desc)
            .addFields(
              { name: '📊', value: summary },
              {
                name: t('commands/droprate:average', { defaultValue: '💡 Average' }),
                value: `+${avgC}💰 ${t('commands/droprate:per_explore', { defaultValue: 'per explore' })}`,
              },
            )
            .setFooter({ text: `Total: ${total}%` }),
        ],
      });
    }

    if (tipe === 'hunt') {
      const desc = BASE_MONSTERS.map((m) => {
        const drops = m.drops
          .map(
            (d) =>
              `${d.emoji} **${d.name}** — \`${d.chance}%\` • ${d.sellPrice}💰 ${RARITY_EMOJI[d.rarity as keyof typeof RARITY_EMOJI]}`,
          )
          .join('\n> ');
        return `${m.emoji} **${m.name}** (Lv.${m.minLevel}+)\n> HP ${m.hp} • DMG ${m.dmg[0]}-${m.dmg[1]} • XP ${m.xp}\n> ${drops}`;
      }).join('\n\n');
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Legendary)
            .setTitle(
              t('commands/droprate:hunt_title', { defaultValue: '⚔️ Drop Rate Detail — Hunt' }),
            )
            .setDescription(desc),
        ],
      });
    }
  }
}
