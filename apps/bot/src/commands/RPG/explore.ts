import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { User } from '@nova/db';
import { checkLevelUp } from '../../lib/rpg/leveling.js';

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Jelajahi dunia Nova dan temukan harta karun',
})
export class ExploreCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const db = this.container.db;

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Gunakan `/start` dulu.');
    if (user.stamina < 10) return interaction.editReply('🥱 Stamina habis (<10).');

    const now = Date.now();
    const cd = 30000;
    if (user.lastExplore && now - user.lastExplore.getTime() < cd) {
      const s = Math.ceil((cd - (now - user.lastExplore.getTime())) / 1000);
      return interaction.editReply(`⏳ Tunggu ${s}s lagi.`);
    }

    const outcomes = [
      {
        text: 'Peti kuno berdebu terbuka!',
        coins: 500,
        exp: 50,
        color: 0x3498db,
        emoji: '📦',
        item: null,
      },
      {
        text: 'Slime hutan kamu tebas!',
        coins: 200,
        exp: 30,
        color: 0x2ecc71,
        emoji: '🟢',
        item: null,
      },
      {
        text: 'Koin emas di akar pohon.',
        coins: 100,
        exp: 20,
        color: 0xf1c40f,
        emoji: '✨',
        item: null,
      },
      {
        text: 'Semak cabai liar ditemukan!',
        coins: 50,
        exp: 15,
        color: 0xe74c3c,
        emoji: '🌶️',
        item: { id: 'chili', name: 'Cabai Liar', emoji: '🌶️', qty: 2, rarity: 'Common', sell: 15 },
      },
      {
        text: 'Daun herbal berkilau di rawa.',
        coins: 70,
        exp: 20,
        color: 0x27ae60,
        emoji: '🌿',
        item: {
          id: 'herb',
          name: 'Daun Herbal',
          emoji: '🌿',
          qty: 1,
          rarity: 'Uncommon',
          sell: 25,
        },
      },
      {
        text: 'DUNGEON! Madu hutan di dalam.',
        coins: 300,
        exp: 60,
        color: 0x9b59b6,
        emoji: '🏰',
        item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 1, rarity: 'Uncommon', sell: 30 },
      },
    ];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    await User.updateOne(
      { discordId: user.discordId },
      {
        $inc: { balance: outcome.coins, exp: outcome.exp, stamina: -10 },
        $set: { lastExplore: new Date() },
      },
    );

    let updated = await User.findOne({ discordId: user.discordId });
    if (!updated) return;

    if (outcome.item) {
      const inv = updated.items.find((i) => i.itemId === outcome.item.id);
      if (inv) inv.qty += outcome.item.qty;
      else updated.items.push({ itemId: outcome.item.id, qty: outcome.item.qty });
      await updated.save();
      await db.item.updateOne(
        { itemId: outcome.item.id },
        {
          $set: {
            name: outcome.item.name,
            emoji: outcome.item.emoji,
            type: 'material',
            rarity: outcome.item.rarity,
            sellPrice: outcome.item.sell,
          },
        },
        { upsert: true },
      );
    }

    let levelUpText = '';
    const lvl = checkLevelUp(updated);
    if (lvl) {
      await User.updateOne(
        { discordId: user.discordId },
        {
          $set: {
            level: lvl.level,
            exp: lvl.expLeft,
            maxHp: lvl.maxHp,
            hp: lvl.hp,
            attack: lvl.attack,
            maxStamina: lvl.maxStamina,
            stamina: lvl.stamina,
          },
        },
      );
      levelUpText = `\n\n🎉 **LEVEL UP → Lv.${lvl.level}**`;
      updated = await User.findOne({ discordId: user.discordId });
    }

    const embed = new EmbedBuilder()
      .setColor(outcome.color)
      .setTitle(`${outcome.emoji} Penjelajahan`)
      .setDescription(
        `*${outcome.text}*\n\n> **+${outcome.coins}** koin\n> **+${outcome.exp}** EXP${outcome.item ? `\n> **+${outcome.item.qty}x ${outcome.item.emoji} ${outcome.item.name}**` : ''}${levelUpText}`,
      )
      .setFooter({ text: `Stamina -10 • ${updated?.stamina}/${updated?.maxStamina}` });

    return interaction.editReply({ embeds: [embed] });
  }
}
