import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { fetchT } from '@sapphire/plugin-i18next';
import { catchFish } from '../../lib/rpg/fishes';
import { rollExplore } from '../../lib/rpg/explorations';
import { getScaledMonster } from '../../lib/rpg/monsters';
import { RARITY_COLOR } from '../../lib/utils';

@ApplyOptions<Command.Options>({
  name: 'simdroprate',
  description: 'Run drop rate simulation (Owner only)',
  preconditions: ['OwnerOnly'],
})
export class SimDroprateCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('type')
            .setDescription('fish/explore/hunt')
            .setRequired(true)
            .addChoices(
              { name: 'Fish', value: 'fish' },
              { name: 'Explore', value: 'explore' },
              { name: 'Hunt', value: 'hunt' },
            ),
        )
        .addIntegerOption((o) =>
          o
            .setName('amount')
            .setDescription('100-10000')
            .setMinValue(100)
            .setMaxValue(10000)
            .setRequired(true),
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const type = interaction.options.getString('type', true);
    const amount = interaction.options.getInteger('amount', true);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const counts: Record<string, { c: number; emoji: string }> = {};
    for (let i = 0; i < amount; i++) {
      let key = '',
        emoji = '';
      if (type === 'fish') {
        const f = catchFish();
        key = f.name;
        emoji = f.emoji;
      }
      if (type === 'explore') {
        const e = rollExplore();
        key = e.text;
        emoji = e.emoji;
      }
      if (type === 'hunt') {
        const m = getScaledMonster(25);
        const roll = Math.random() * 100;
        let cum = 0;
        const d = m.drops.find((x) => (cum += x.chance) >= roll);
        key = d ? d.name : t('commands/droprate:no_drop');
        emoji = d?.emoji ?? '❌';
      }
      if (!counts[key]) counts[key] = { c: 0, emoji };
      counts[key].c++;
    }

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1].c - a[1].c)
      .slice(0, 25);
    const desc = sorted
      .map(([k, v]) => `${v.emoji} **${k}** — ${v.c}x (${((v.c / amount) * 100).toFixed(2)}%)`)
      .join('\n');

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(RARITY_COLOR.Epic)
          .setTitle(t('commands/droprate:sim_title', { sim: amount.toLocaleString(), type }))
          .setDescription(desc)
          .setFooter({ text: 'Owner-only simulation' }),
      ],
    });
  }
}
