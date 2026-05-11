import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR, RARITY_EMOJI } from '../../lib/utils';
import { catchFish, FISHES } from '../../lib/rpg/fishes';
import { ACTION_COST } from '../../lib/rpg/actions';

const groupByRarity = <T extends { rarity: string }>(arr: T[]) =>
  arr.reduce(
    (acc, cur) => ((acc[cur.rarity] = acc[cur.rarity]?? []).push(cur), acc),
    {} as Record<string, T[]>,
  );

const raritySummary = Object.entries(groupByRarity(FISHES))
.map(
    ([r, arr]) =>
      `${RARITY_EMOJI[r as keyof typeof RARITY_EMOJI]} ${r} ${arr.reduce((a, b) => a + b.chance, 0)}%`,
  )
.join(' • ');

@ApplyOptions<Command.Options>({
  name: 'fish',
  description: 'Mancing santai, dapat ikan untuk dijual atau dimasak',
  detailedDescription: {
    usage: '/fish',
    examples: ['/fish'],
    extendedHelp: `
Cooldown 30 detik • cost ${ACTION_COST.fish} stamina.

**Kegunaan ikan:**
1. **Jual** — pakai /sell untuk koin instan
2. **Masak** — pakai /cook untuk jadi Fish Soup (+40 HP) atau resep lain

**Drop:** 13 jenis ikan dari Common sampai Legendary
**Rarity:** ${raritySummary}

Tips: ikan Rare+ jangan langsung dijual, simpan untuk masak sebelum /hunt. Rata-rata jual ~${Math.round(FISHES.reduce((a, f) => a + f.sell * (f.chance / 100), 0))}💰.
Lihat tabel: /droprate tipe:fish
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class FishCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    applyPassiveRegen(user);
    const now = Date.now();
    const cd = 30_000;
    if (now - (user.lastFish?.getTime()?? 0) < cd) {
      const wait = Math.ceil((cd - (now - (user.lastFish?.getTime()?? 0))) / 1000);
      await user.save();
      return interaction.editReply(`🎣 Joran masih basah! Tunggu ${wait}s`);
    }
    if (user.stamina < ACTION_COST.fish) {
      await user.save();
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/${ACTION_COST.fish})`);
    }

    const fish = catchFish();

    user.stamina -= ACTION_COST.fish;
    user.lastFish = new Date();
    user.exp = (user.exp?? 0) + fish.xp;

    const inv = user.items.find((i) => i.itemId === fish.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: fish.id, qty: 1 });

    await this.container.db.item.updateOne(
      { itemId: fish.id },
      {
        $set: {
          name: fish.name,
          emoji: fish.emoji,
          type: 'material',
          rarity: fish.rarity,
          sellPrice: fish.sell,
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const levelData = checkLevelUp(user);
    if (levelData) {
      Object.assign(user, levelData);
      levelUpText = `\n🎉 **LEVEL UP! → Lv.${levelData.level}**`;
    }

    await user.save();

    const embed = new EmbedBuilder()
    .setColor(RARITY_COLOR[fish.rarity])
    .setAuthor({
        name: `${interaction.user.username} memancing`,
        iconURL: interaction.user.displayAvatarURL(),
      })
    .setDescription(`**${fish.emoji} ${fish.name}** tertangkap!\n*${fish.rarity}*${levelUpText}`)
    .addFields(
        { name: '💰 Jual', value: `${fish.sell} koin`, inline: true },
        { name: '🍳 Masak', value: 'Bisa untuk Fish Soup', inline: true },
        { name: '✨ EXP', value: `+${fish.xp}`, inline: true },
        {
          name: '⚡ Stamina',
          value: `${user.stamina + ACTION_COST.fish} → ${user.stamina}`,
          inline: true,
        },
      )
    .setFooter({ text: 'Gunakan /cook untuk heal sebelum hunt' });

    return interaction.editReply({ embeds: [embed] });
  }
}
