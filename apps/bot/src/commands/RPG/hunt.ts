import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

const DROP_TABLE = [
  // COMMON 50%
  { id: 'meat', name: 'Daging Mentah', emoji: '🥩', rarity: 'Common', chance: 30, sell: 12 },
  { id: 'hide', name: 'Kulit Hewan', emoji: '🦌', rarity: 'Common', chance: 20, sell: 10 },
  // UNCOMMON 30%
  { id: 'claw', name: 'Cakar Serigala', emoji: '🐾', rarity: 'Uncommon', chance: 15, sell: 25 },
  { id: 'fang', name: 'Taring Babi', emoji: '🦷', rarity: 'Uncommon', chance: 15, sell: 28 },
  // RARE 15%
  { id: 'pelt', name: 'Bulu Alpha', emoji: '🧶', rarity: 'Rare', chance: 10, sell: 55 },
  { id: 'horn', name: 'Tanduk Kecil', emoji: '🦏', rarity: 'Rare', chance: 5, sell: 70 },
  // EPIC 4%
  { id: 'core_beast', name: 'Beast Core', emoji: '🔥', rarity: 'Epic', chance: 3, sell: 150 },
  { id: 'eye_wolf', name: 'Mata Serigala', emoji: '👁️', rarity: 'Epic', chance: 1, sell: 180 },
  // LEGENDARY 1%
  {
    id: 'heart_alpha',
    name: 'Jantung Alpha',
    emoji: '❤️‍🔥',
    rarity: 'Legendary',
    chance: 1,
    sell: 400,
  },
];

const MONSTERS = [
  { name: 'Wild Boar', hp: 60, dmg: [8, 15] },
  { name: 'Forest Wolf', hp: 80, dmg: [12, 20] },
  { name: 'Goblin Scout', hp: 50, dmg: [5, 12] },
];

const colorByRarity = {
  Common: 0x95a5a6,
  Uncommon: 0x2ecc71,
  Rare: 0x3498db,
  Epic: 0x9b59b6,
  Legendary: 0xf1c40f,
};

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

    if ((user.stamina ?? 0) < 20)
      return interaction.editReply(`⚡ Stamina kurang (${user.stamina}/20)`);
    if ((user.hp ?? 0) < 20) return interaction.editReply(`❤️ HP rendah (${user.hp}). Heal dulu!`);

    user.stamina -= 20;
    const monster = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
    let mHp = monster.hp,
      uHp = user.hp;

    // battle simple
    while (mHp > 0 && uHp > 0) {
      mHp -= Math.floor(Math.random() * 15) + 10;
      if (mHp <= 0) break;
      uHp -= Math.floor(Math.random() * (monster.dmg[1] - monster.dmg[0])) + monster.dmg[0];
    }
    user.hp = Math.max(0, uHp);

    if (uHp <= 0) {
      await user.save();
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({
          name: `${interaction.user.username} berburu`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setDescription(`💀 Kalah melawan **${monster.name}**!`);
      return interaction.editReply({ embeds: [embed] });
    }

    // roll drop
    const roll = Math.random() * 100;
    let cum = 0;
    const drop = DROP_TABLE.find((d) => (cum += d.chance) >= roll)!;

    // update inventory
    const inv = user.items.find((i) => i.itemId === drop.id);
    if (inv) inv.qty += 1;
    else user.items.push({ itemId: drop.id, qty: 1 });
    user.balance += 50; // bonus hunt

    await user.save();

    // upsert item ke DB biar inventory kamu bisa render
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

    const embed = new EmbedBuilder()
      .setColor(colorByRarity[drop.rarity as keyof typeof colorByRarity])
      .setAuthor({
        name: `${interaction.user.username} berburu`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setDescription(
        `**${drop.emoji} ${drop.name}** didapat dari ${monster.name}!\n*${drop.rarity}*`,
      )
      .addFields(
        { name: '💰 Bonus', value: '50 koin', inline: true },
        { name: '⚡ Stamina', value: `${user.stamina + 20} → ${user.stamina}`, inline: true },
        { name: '❤️ HP', value: `${user.hp}/${user.maxHp}`, inline: true },
      )
      .setFooter({
        text: `Total ${drop.name}: ${user.items.find((i) => i.itemId === drop.id)?.qty}x`,
      });

    return interaction.editReply({ embeds: [embed] });
  }
}
