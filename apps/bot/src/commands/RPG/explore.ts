import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { applyPassiveRegen } from '../../lib/rpg/buffs';

const outcomes = [
  // === TANPA ITEM (tetap ada biar gak OP) ===
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
    text: 'Kabut tebal, kamu hanya dapat pengalaman.',
    coins: 30,
    exp: 25,
    color: 0x95a5a6,
    emoji: '🌫️',
    item: null,
  },

  // === COMMON ITEMS (60% dari yang drop) ===
  {
    text: 'Semak cabai liar ditemukan!',
    coins: 50,
    exp: 15,
    color: 0xe74c3c,
    emoji: '🌶️',
    item: { id: 'chili', name: 'Cabai Liar', emoji: '🌶️', qty: 2, rarity: 'Common', sell: 15 },
  },
  {
    text: 'Kamu memetik jamur hutan.',
    coins: 40,
    exp: 12,
    color: 0x8e44ad,
    emoji: '🍄',
    item: {
      id: 'mushroom',
      name: 'Jamur Hutan',
      emoji: '🍄',
      qty: 3,
      rarity: 'Common',
      sell: 8,
    },
  },
  {
    text: 'Sarang lebah kecil jatuh dari pohon.',
    coins: 60,
    exp: 18,
    color: 0xf39c12,
    emoji: '🐝',
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 1, rarity: 'Common', sell: 30 },
  },
  {
    text: 'Kamu menemukan akar ginseng liar.',
    coins: 70,
    exp: 20,
    color: 0xd35400,
    emoji: '🌱',
    item: { id: 'root', name: 'Akar Ginseng', emoji: '🌱', qty: 1, rarity: 'Common', sell: 20 },
  },

  // === UNCOMMON ITEMS ===
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
    text: 'Kristal mana kecil bersinar.',
    coins: 120,
    exp: 30,
    color: 0x3498db,
    emoji: '🔷',
    item: {
      id: 'mana_crystal',
      name: 'Kristal Mana',
      emoji: '🔷',
      qty: 1,
      rarity: 'Uncommon',
      sell: 45,
    },
  },
  {
    text: 'Kulit kayu kuno untuk ramuan.',
    coins: 90,
    exp: 22,
    color: 0x795548,
    emoji: '🪵',
    item: { id: 'bark', name: 'Kulit Kayu', emoji: '🪵', qty: 2, rarity: 'Uncommon', sell: 18 },
  },

  // === RARE ===
  {
    text: 'DUNGEON! Peti berisi madu hutan.',
    coins: 300,
    exp: 60,
    color: 0x9b59b6,
    emoji: '🏰',
    item: { id: 'honey', name: 'Madu Liar', emoji: '🍯', qty: 2, rarity: 'Uncommon', sell: 30 },
  },
  {
    text: 'Kamu menemukan bunga moonlight langka!',
    coins: 150,
    exp: 40,
    color: 0x9b59b6,
    emoji: '🌸',
    item: {
      id: 'moonflower',
      name: 'Moonflower',
      emoji: '🌸',
      qty: 1,
      rarity: 'Rare',
      sell: 80,
    },
  },
  {
    text: 'Telur monster kecil masih hangat.',
    coins: 200,
    exp: 50,
    color: 0xe67e22,
    emoji: '🥚',
    item: {
      id: 'monster_egg',
      name: 'Telur Monster',
      emoji: '🥚',
      qty: 1,
      rarity: 'Rare',
      sell: 120,
    },
  },

  // === EPIC (jackpot) ===
  {
    text: 'HARTA KARUN! Peti emas terkubur!',
    coins: 800,
    exp: 100,
    color: 0xf1c40f,
    emoji: '💎',
    item: {
      id: 'gold_nugget',
      name: 'Bongkah Emas',
      emoji: '💎',
      qty: 1,
      rarity: 'Epic',
      sell: 300,
    },
  },
];

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

    const user = await db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Gunakan `/start` dulu.');
    applyPassiveRegen(user);

    if (user.stamina < 10) {
      await user.save();
      return interaction.editReply('🥱 Stamina habis (<10).');
    }

    const now = Date.now();
    const cd = 30000;
    if (user.lastExplore && now - user.lastExplore.getTime() < cd) {
      const s = Math.ceil((cd - (now - user.lastExplore.getTime())) / 1000);
      await user.save();
      return interaction.editReply(`⏳ Tunggu ${s}s lagi.`);
    }

    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    await db.user.updateOne(
      { discordId: user.discordId },
      {
        $inc: { balance: outcome.coins, exp: outcome.exp, stamina: -10 },
        $set: { lastExplore: new Date() },
      },
    );

    let updated = await db.user.findOne({ discordId: user.discordId });
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
      await db.user.updateOne(
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
      updated = await db.user.findOne({ discordId: user.discordId });
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
