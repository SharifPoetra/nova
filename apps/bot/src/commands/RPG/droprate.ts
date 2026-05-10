import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { FISHES, catchFish } from '../../lib/rpg/fishes';
import { EXPLORES, rollExplore } from '../../lib/rpg/explorations';
import { BASE_MONSTERS, getScaledMonster } from '../../lib/rpg/monsters';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/constants';

@ApplyOptions<Command.Options>({
  name: 'droprate',
  description: 'Lihat drop rate detail untuk fish, explore, dan hunt',
  detailedDescription: {
    usage: '/droprate <tipe> [sim]',
    examples: [
      '/droprate tipe:fish',
      '/droprate tipe:explore',
      '/droprate tipe:hunt',
      '/droprate tipe:fish sim:1000 (Admin only)',
    ],
    extendedHelp: `
**Fitur:**
• Menampilkan chance, harga jual, XP, dan rarity untuk setiap drop
• Menghitung expected value (rata-rata koin per aksi)
• Simulasi hingga 10.000x roll untuk validasi balance (khusus Admin)

**Tipe:**
🎣 fish — 13 jenis ikan dari Common sampai Legendary
🗺️ explore — 15 outcome petualangan
⚔️ hunt — 5 monster dengan drop independen

Gunakan ini untuk balance ekonomi Nova RPG tanpa buka kode.
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class DroprateCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o
            .setName('tipe')
            .setDescription('Pilih tabel yang mau dilihat')
            .setRequired(true)
            .addChoices(
              { name: 'Fish 🎣', value: 'fish' },
              { name: 'Explore 🗺️', value: 'explore' },
              { name: 'Hunt ⚔️', value: 'hunt' },
            ),
        )
        .addIntegerOption((o) =>
          o
            .setName('sim')
            .setDescription('Jalankan simulasi (Admin only, 100-10000)')
            .setMinValue(100)
            .setMaxValue(10000),
        ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const tipe = interaction.options.getString('tipe', true);
    const sim = interaction.options.getInteger('sim');

    if (sim) {
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      const isDev = process.env.OWNER_ID?.split(',').includes(interaction.user.id);
      if (!isAdmin && !isDev)
        return interaction.reply({ content: '❌ Simulasi hanya untuk Admin.', ephemeral: true });

      await interaction.deferReply();
      const counts: Record<string, { c: number; emoji: string }> = {};
      for (let i = 0; i < sim; i++) {
        let key = '',
          emoji = '';
        if (tipe === 'fish') {
          const f = catchFish();
          key = f.name;
          emoji = f.emoji;
        }
        if (tipe === 'explore') {
          const e = rollExplore();
          key = e.text;
          emoji = e.emoji;
        }
        if (tipe === 'hunt') {
          const m = getScaledMonster(5);
          const d = m.drops.find((x) => Math.random() * 100 < x.chance);
          key = d ? d.name : 'No Drop';
          emoji = d?.emoji ?? '❌';
        }
        if (!counts[key]) counts[key] = { c: 0, emoji };
        counts[key].c++;
      }
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1].c - a[1].c)
        .slice(0, 20);
      const desc = sorted
        .map(([k, v]) => `${v.emoji} **${k}** — ${v.c}x (${((v.c / sim) * 100).toFixed(2)}%)`)
        .join('\n');
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Epic)
            .setTitle(`🎲 Simulasi ${sim.toLocaleString()}x — ${tipe}`)
            .setDescription(desc),
        ],
      });
    }

    if (tipe === 'fish') {
      const total = FISHES.reduce((a, f) => a + f.chance, 0);
      const desc = FISHES.map(
        (f) =>
          `${f.emoji} **${f.name}** ${RARITY_EMOJI[f.rarity]}\n> Chance: \`${f.chance}%\` • Jual: \`${f.sell}💰\` • XP: \`${f.xp}\``,
      ).join('\n\n');
      const summary = Object.entries(Object.groupBy(FISHES, (f) => f.rarity))
        .map(
          ([r, arr]) =>
            `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} **${r}**: ${arr!.reduce((a, b) => a + b.chance, 0)}%`,
        )
        .join(' • ');
      const ev = Math.round(FISHES.reduce((a, f) => a + f.sell * (f.chance / 100), 0));
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Rare)
            .setTitle('🎣 Drop Rate Detail — Fish')
            .setDescription(desc)
            .addFields({ name: '📊 Rarity', value: summary })
            .setFooter({ text: `EV: ~${ev}💰 per catch • Total: ${total}%` }),
        ],
      });
    }

    if (tipe === 'explore') {
      const total = EXPLORES.reduce((a, e) => a + e.chance, 0);
      const desc = EXPLORES.map((e) => {
        const item = e.item ? `\n> Drop: ${e.item.qty}x ${e.item.emoji} ${e.item.name}` : '';
        return `${e.emoji} **${e.text}** ${RARITY_EMOJI[e.rarity]}\n> Chance: \`${e.chance}%\` • +${e.coins}💰 • +${e.exp}XP${item}`;
      }).join('\n\n');
      const summary = Object.entries(Object.groupBy(EXPLORES, (e) => e.rarity))
        .map(
          ([r, arr]) =>
            `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r}: ${arr!.reduce((a, b) => a + b.chance, 0)}%`,
        )
        .join(' • ');
      const avgC = Math.round(EXPLORES.reduce((a, e) => a + e.coins * (e.chance / 100), 0));
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Epic)
            .setTitle('🗺️ Drop Rate Detail — Explore')
            .setDescription(desc)
            .addFields(
              { name: '📊', value: summary },
              { name: '💡 Rata-rata', value: `+${avgC}💰 per explore` },
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
              `${d.emoji} **${d.name}** — \`${d.chance}%\` • ${d.sell}💰 ${RARITY_EMOJI[d.rarity as keyof typeof RARITY_EMOJI]}`,
          )
          .join('\n> ');
        return `${m.emoji} **${m.name}** (Lv.${m.minLevel}+)\n> HP ${m.hp} • DMG ${m.dmg[0]}-${m.dmg[1]} • XP ${m.xp}\n> ${drops}`;
      }).join('\n\n');
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(RARITY_COLOR.Legendary)
            .setTitle('⚔️ Drop Rate Detail — Hunt')
            .setDescription(desc),
        ],
      });
    }
  }
}
