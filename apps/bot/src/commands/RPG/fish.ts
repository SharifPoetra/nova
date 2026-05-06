import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

const FISH_TABLE = [
  // COMMON 55%
  { id: 'fish_sardine', name: 'Sarden', emoji: '🐟', rarity: 'Common', chance: 25, sell: 5 },
  { id: 'fish_mackerel', name: 'Kembung', emoji: '🐟', rarity: 'Common', chance: 20, sell: 7 },
  { id: 'fish_tilapia', name: 'Nila', emoji: '🐠', rarity: 'Common', chance: 10, sell: 8 },

  // UNCOMMON 25%
  { id: 'fish_catfish', name: 'Lele Jumbo', emoji: '🐡', rarity: 'Uncommon', chance: 12, sell: 15 },
  { id: 'fish_tuna', name: 'Tuna Kecil', emoji: '🐟', rarity: 'Uncommon', chance: 8, sell: 18 },
  { id: 'fish_salmon', name: 'Salmon', emoji: '🍣', rarity: 'Uncommon', chance: 5, sell: 22 },

  // RARE 13%
  { id: 'fish_goldfish', name: 'Ikan Mas Koki', emoji: '🐠', rarity: 'Rare', chance: 7, sell: 40 },
  { id: 'fish_puffer', name: 'Buntal Berduri', emoji: '🐡', rarity: 'Rare', chance: 4, sell: 50 },
  { id: 'fish_eel', name: 'Belut Listrik', emoji: '🦈', rarity: 'Rare', chance: 2, sell: 65 },

  // EPIC 5%
  { id: 'fish_koi', name: 'Koi Legendaris', emoji: '🎏', rarity: 'Epic', chance: 3, sell: 120 },
  { id: 'fish_sword', name: 'Todak Pedang', emoji: '🗡️', rarity: 'Epic', chance: 2, sell: 150 },

  // LEGENDARY 2%
  {
    id: 'fish_dragon',
    name: 'Ikan Naga',
    emoji: '🐉',
    rarity: 'Legendary',
    chance: 1.5,
    sell: 300,
  },
  {
    id: 'fish_kraken',
    name: 'Baby Kraken',
    emoji: '🦑',
    rarity: 'Legendary',
    chance: 0.5,
    sell: 500,
  },
];

@ApplyOptions<Command.Options>({
  name: 'fish',
  description: 'Mancing santai, dapat ikan untuk dijual',
  fullCategory: ['RPG'],
})
export class FishCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    // cooldown 30 detik
    const now = Date.now();
    const lastFish = user.lastFish?.getTime() ?? 0;
    const cd = 30 * 1000;
    if (now - lastFish < cd) {
      const wait = Math.ceil((cd - (now - lastFish)) / 1000);
      return interaction.editReply(`🎣 Joran masih basah! Tunggu ${wait}s`);
    }

    if (user.stamina < 10) {
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/10). Tunggu regen.`);
    }

    // roll ikan
    const roll = Math.random() * 100;
    let cum = 0;
    const fish = FISH_TABLE.find((f) => (cum += f.chance) >= roll)!;

    // warna by rarity
    const colorByRarity = {
      Common: 0x95a5a6,
      Uncommon: 0x2ecc71,
      Rare: 0x3498db,
      Epic: 0x9b59b6,
      Legendary: 0xf1c40f,
    };

    // update user
    user.stamina -= 10;
    user.lastFish = new Date();

    const inv = user.items.find((i) => i.itemId === fish.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: fish.id, qty: 1 });

    await user.save();

    // pastikan item ada di DB item
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

    const embed = new EmbedBuilder()
      .setColor(colorByRarity[fish.rarity as keyof typeof colorByRarity])
      .setAuthor({
        name: `${interaction.user.username} memancing`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(`**${fish.emoji} ${fish.name}** tertangkap!\n*${fish.rarity}*`)
      .addFields(
        { name: '💰 Jual', value: `${fish.sell} koin`, inline: true },
        { name: '⚡ Stamina', value: `${user.stamina + 10} → ${user.stamina}`, inline: true },
        {
          name: '📦 Total',
          value: `${user.items.find((i) => i.itemId === fish.id)?.qty}x`,
          inline: true,
        },
      )
      .setFooter({ text: 'Rarity lebih tinggi = harga jual lebih mahal' });

    return interaction.editReply({ embeds: [embed] });
  }
}
