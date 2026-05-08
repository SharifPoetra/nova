import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

const colorByRarity = {
  Common: 0x95a5a6,
  Uncommon: 0x2ecc71,
  Rare: 0x3498db,
  Epic: 0x9b59b6,
  Legendary: 0xf1c40f,
};

const FISH_TABLE = [
  // COMMON 55%
  { id: 'fish_sardine', name: 'Sarden', emoji: '🐟', rarity: 'Common', chance: 25, sell: 5, xp: 8 },
  {
    id: 'fish_mackerel',
    name: 'Kembung',
    emoji: '🐟',
    rarity: 'Common',
    chance: 20,
    sell: 7,
    xp: 9,
  },
  { id: 'fish_tilapia', name: 'Nila', emoji: '🐠', rarity: 'Common', chance: 10, sell: 8, xp: 10 },

  // UNCOMMON 25%
  {
    id: 'fish_catfish',
    name: 'Lele Jumbo',
    emoji: '🐡',
    rarity: 'Uncommon',
    chance: 12,
    sell: 15,
    xp: 14,
  },
  {
    id: 'fish_tuna',
    name: 'Tuna Kecil',
    emoji: '🐟',
    rarity: 'Uncommon',
    chance: 8,
    sell: 18,
    xp: 16,
  },
  {
    id: 'fish_salmon',
    name: 'Salmon',
    emoji: '🍣',
    rarity: 'Uncommon',
    chance: 5,
    sell: 22,
    xp: 18,
  },

  // RARE 13%
  {
    id: 'fish_goldfish',
    name: 'Ikan Mas Koki',
    emoji: '🐠',
    rarity: 'Rare',
    chance: 7,
    sell: 40,
    xp: 25,
  },
  {
    id: 'fish_puffer',
    name: 'Buntal Berduri',
    emoji: '🐡',
    rarity: 'Rare',
    chance: 4,
    sell: 50,
    xp: 28,
  },
  {
    id: 'fish_eel',
    name: 'Belut Listrik',
    emoji: '🦈',
    rarity: 'Rare',
    chance: 2,
    sell: 65,
    xp: 30,
  },

  // EPIC 5%
  {
    id: 'fish_koi',
    name: 'Koi Legendaris',
    emoji: '🎏',
    rarity: 'Epic',
    chance: 3,
    sell: 120,
    xp: 45,
  },
  {
    id: 'fish_sword',
    name: 'Todak Pedang',
    emoji: '🗡️',
    rarity: 'Epic',
    chance: 2,
    sell: 150,
    xp: 50,
  },

  // LEGENDARY 2%
  {
    id: 'fish_dragon',
    name: 'Ikan Naga',
    emoji: '🐉',
    rarity: 'Legendary',
    chance: 1.5,
    sell: 300,
    xp: 80,
  },
  {
    id: 'fish_kraken',
    name: 'Baby Kraken',
    emoji: '🦑',
    rarity: 'Legendary',
    chance: 0.5,
    sell: 500,
    xp: 120,
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

    applyPassiveRegen(user);

    const now = Date.now();
    const lastFish = user.lastFish?.getTime() ?? 0;
    const cd = 30 * 1000;
    if (now - lastFish < cd) {
      const wait = Math.ceil((cd - (now - lastFish)) / 1000);
      await user.save();
      return interaction.editReply(`🎣 Joran masih basah! Tunggu ${wait}s`);
    }

    if (user.stamina < 10) {
      await user.save();
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/10). Tunggu regen.`);
    }

    const roll = Math.random() * 100;
    let cum = 0;
    const fish = FISH_TABLE.find((f) => (cum += f.chance) >= roll)!;

    user.stamina -= 10;
    user.lastFish = new Date();
    user.exp = (user.exp ?? 0) + fish.xp;

    const inv = user.items.find((i) => i.itemId === fish.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: fish.id, qty: 1 });

    await user.save();

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

    // cek level up
    let levelUpText = '';
    const levelData = checkLevelUp(user);
    if (levelData) {
      await this.container.db.user.updateOne(
        { discordId: interaction.user.id },
        {
          $set: {
            level: levelData.level,
            exp: levelData.expLeft,
            maxHp: levelData.maxHp,
            hp: levelData.hp,
            attack: levelData.attack,
            maxStamina: levelData.maxStamina,
            stamina: levelData.stamina,
          },
        },
      );
      levelUpText = `\n🎉 **LEVEL UP!** Lv.${levelData.level}`;
    }

    const embed = new EmbedBuilder()
      .setColor(colorByRarity[fish.rarity as keyof typeof colorByRarity])
      .setAuthor({
        name: `${interaction.user.username} memancing`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(`**${fish.emoji} ${fish.name}** tertangkap!\n*${fish.rarity}*${levelUpText}`)
      .addFields(
        { name: '💰 Jual', value: `${fish.sell} koin`, inline: true },
        { name: '✨ EXP', value: `+${fish.xp}`, inline: true },
        { name: '⚡ Stamina', value: `${user.stamina + 10} → ${user.stamina}`, inline: true },
        {
          name: '📦 Total',
          value: `${user.items.find((i) => i.itemId === fish.id)?.qty}x`,
          inline: true,
        },
      )
      .setFooter({ text: 'Rarity lebih tinggi = XP lebih besar' });

    return interaction.editReply({ embeds: [embed] });
  }
}
