import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling.js';

const colorByRarity = {
  Common: 0x95a5a6,
  Uncommon: 0x2ecc71,
  Rare: 0x3498db,
  Epic: 0x9b59b6,
  Legendary: 0xf1c40f,
};

const MONSTERS = [
  {
    name: 'Wild Boar',
    emoji: '🐗',
    hp: 60,
    dmg: [8, 15],
    minLevel: 1,
    xp: 18,
    drops: [
      { id: 'meat', name: 'Daging Babi', emoji: '🥩', rarity: 'Common', chance: 60, sell: 12 },
      { id: 'fang', name: 'Taring Babi', emoji: '🦷', rarity: 'Uncommon', chance: 30, sell: 28 },
      { id: 'boar_heart', name: 'Jantung Babi', emoji: '❤️', rarity: 'Rare', chance: 10, sell: 75 },
    ],
  },
  {
    name: 'Goblin Scout',
    emoji: '👺',
    hp: 50,
    dmg: [5, 12],
    minLevel: 1,
    xp: 15,
    drops: [
      {
        id: 'goblin_ear',
        name: 'Telinga Goblin',
        emoji: '👂',
        rarity: 'Common',
        chance: 55,
        sell: 10,
      },
      { id: 'hide', name: 'Kulit Goblin', emoji: '🦌', rarity: 'Common', chance: 30, sell: 12 },
      {
        id: 'goblin_dagger',
        name: 'Belati Karat',
        emoji: '🗡️',
        rarity: 'Uncommon',
        chance: 15,
        sell: 40,
      },
    ],
  },
  {
    name: 'Swamp Lizard',
    emoji: '🦎',
    hp: 70,
    dmg: [10, 18],
    minLevel: 2,
    xp: 22,
    drops: [
      {
        id: 'lizard_meat',
        name: 'Daging Kadal',
        emoji: '🍗',
        rarity: 'Common',
        chance: 60,
        sell: 14,
      },
      {
        id: 'lizard_tail',
        name: 'Ekor Kadal',
        emoji: '🦎',
        rarity: 'Uncommon',
        chance: 30,
        sell: 26,
      },
      { id: 'scale', name: 'Sisik Hijau', emoji: '🟢', rarity: 'Rare', chance: 10, sell: 60 },
    ],
  },
  {
    name: 'Forest Wolf',
    emoji: '🐺',
    hp: 80,
    dmg: [12, 20],
    minLevel: 3,
    xp: 28,
    drops: [
      {
        id: 'wolf_meat',
        name: 'Daging Serigala',
        emoji: '🍖',
        rarity: 'Common',
        chance: 50,
        sell: 15,
      },
      { id: 'claw', name: 'Cakar Serigala', emoji: '🐾', rarity: 'Uncommon', chance: 35, sell: 25 },
      { id: 'pelt', name: 'Bulu Alpha', emoji: '🧶', rarity: 'Rare', chance: 5, sell: 55 },
      { id: 'eye_wolf', name: 'Mata Serigala', emoji: '👁️', rarity: 'Epic', chance: 10, sell: 180 },
    ],
  },
  {
    name: 'Cave Bear',
    emoji: '🐻',
    hp: 120,
    dmg: [18, 28],
    minLevel: 5,
    xp: 45,
    drops: [
      {
        id: 'bear_meat',
        name: 'Daging Beruang',
        emoji: '🥩',
        rarity: 'Uncommon',
        chance: 50,
        sell: 35,
      },
      { id: 'honey', name: 'Madu Liar', emoji: '🍯', rarity: 'Uncommon', chance: 15, sell: 30 },
      { id: 'bear_claw', name: 'Cakar Beruang', emoji: '🐾', rarity: 'Rare', chance: 30, sell: 80 },
      {
        id: 'heart_alpha',
        name: 'Jantung Alpha',
        emoji: '❤️‍🔥',
        rarity: 'Legendary',
        chance: 5,
        sell: 400,
      },
    ],
  },
];

@ApplyOptions<Command.Options>({
  name: 'hunt',
  description: 'Berburu monster (cost 20 stamina)',
  fullCategory: ['RPG'],
})
export class HuntCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;
    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    const now = Date.now();
    const lastHunt = user.lastHunt?.getTime() ?? 0;
    const cd = 45 * 1000;
    if (now - lastHunt < cd) {
      const wait = Math.ceil((cd - (now - lastHunt)) / 1000);
      return interaction.editReply(`🏹 Kamu masih capek! Tunggu ${wait}s lagi.`);
    }

    if ((user.stamina ?? 0) < 20)
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/20)`);
    if ((user.hp ?? 0) < 20)
      return interaction.editReply(
        `❤️ HP rendah (${user.hp}). Masak di /cook atau beli potion di /shop!`,
      );

    user.stamina -= 20;
    user.lastHunt = new Date();

    // filter monster by level
    const available = MONSTERS.filter((m) => (user.level ?? 1) >= m.minLevel);
    const monster = available[Math.floor(Math.random() * available.length)];

    let mHp = monster.hp,
      uHp = user.hp;
    while (mHp > 0 && uHp > 0) {
      mHp -= Math.floor(Math.random() * 15) + 10 + Math.floor((user.attack ?? 10) / 3);
      if (mHp <= 0) break;
      uHp -= Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
    }
    user.hp = Math.max(0, uHp);

    if (uHp <= 0) {
      user.exp = (user.exp ?? 0) + Math.floor(monster.xp / 3); // tetap dapat XP meski kalah
      await user.save();
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({
          name: `${interaction.user.username} berburu`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(
          `💀 Kalah melawan **${monster.emoji} ${monster.name}**!\n\n> +${Math.floor(monster.xp / 3)} EXP (pantang menyerah)`,
        );
      return interaction.editReply({ embeds: [embed] });
    }

    const roll = Math.random() * 100;
    let cum = 0;
    const drop = monster.drops.find((d) => (cum += d.chance) >= roll)!;

    const inv = user.items.find((i) => i.itemId === drop.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: drop.id, qty: 1 });

    user.balance += 50;
    user.exp = (user.exp ?? 0) + monster.xp;

    await user.save();
    await db.item.updateOne(
      { itemId: drop.id },
      {
        $set: {
          name: drop.name,
          emoji: drop.emoji,
          type: 'material',
          rarity: drop.rarity,
          sellPrice: drop.sell,
        },
      },
      { upsert: true },
    );

    let levelUpText = '';
    const levelData = checkLevelUp(user);
    if (levelData) {
      await db.user.updateOne(
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
      .setColor(colorByRarity[drop.rarity as keyof typeof colorByRarity])
      .setAuthor({
        name: `${interaction.user.username} berburu`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(
        `Mengalahkan **${monster.emoji} ${monster.name}**!${levelUpText}\n\n**${drop.emoji} ${drop.name}** didapat!\n*${drop.rarity}*`,
      )
      .addFields(
        { name: '💰 Bonus', value: '50 koin', inline: true },
        { name: '✨ EXP', value: `+${monster.xp}`, inline: true },
        { name: '⚡ Stamina', value: `${user.stamina + 20} → ${user.stamina}`, inline: true },
        { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
      )
      .setFooter({
        text: `Lv.${user.level} needed for next monster • Total ${drop.name}: ${user.items.find((i) => i.itemId === drop.id)?.qty}x`,
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
