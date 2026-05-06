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
  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();

    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply('❌ Kamu belum memulai petualangan! Gunakan `/start` dulu.');
    }

    // stamina check
    if (user.stamina < 10) {
      return interaction.editReply('🥱 Stamina kamu habis. Tunggu regen atau pakai `/daily`.');
    }

    const now = Date.now();
    const cooldown = 30000;
    if (user.lastExplore && now - user.lastExplore.getTime() < cooldown) {
      const s = Math.ceil((cooldown - (now - user.lastExplore.getTime())) / 1000);
      return interaction.editReply(`⏳ Kamu masih lelah. Tunggu ${s} detik lagi.`);
    }

    const outcomes = [
      {
        text: 'Kamu membuka peti kuno berdebu. Cahaya biru menyembur!',
        coins: 500,
        exp: 50,
        color: 0x3498db,
        emoji: '📦',
      },
      {
        text: 'Slime hutan melompat! Kamu tebas dengan sigap.',
        coins: 200,
        exp: 30,
        color: 0x2ecc71,
        emoji: '🟢',
      },
      {
        text: 'Koin emas tergeletak di antara akar pohon.',
        coins: 100,
        exp: 20,
        color: 0xf1c40f,
        emoji: '✨',
      },
      {
        text: 'Kabut tebal membuatmu tersesat. Hanya remah roti.',
        coins: 50,
        exp: 10,
        color: 0x95a5a6,
        emoji: '🌫️',
      },
      {
        text: 'Dinding retak terbuka — DUNGEON TERSEMBUNYI!',
        coins: 1000,
        exp: 100,
        color: 0x9b59b6,
        emoji: '🏰',
      },
    ];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    await User.updateOne(
      { discordId: interaction.user.id },
      {
        $inc: { balance: outcome.coins, exp: outcome.exp, stamina: -10 },
        $set: { lastExplore: new Date() },
      },
    );

    const updated = await User.findOne({ discordId: interaction.user.id });
    if (!updated) return;

    let levelUpText = '';
    const levelData = checkLevelUp(updated);
    if (levelData) {
      await User.updateOne(
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
      levelUpText = `\n\n🎉 **LEVEL UP!** Kamu sekarang Level ${levelData.level}! +20 HP, +3 ATK, +10 Stamina`;
    }

    const embed = new EmbedBuilder()
      .setColor(outcome.color)
      .setTitle(`${outcome.emoji} Penjelajahan`)
      .setDescription(
        `*${outcome.text}*\n\n> **+${outcome.coins}** koin\n> **+${outcome.exp}** EXP${levelUpText}`,
      )
      .setFooter({ text: `Stamina -10 • Sisa ${updated.stamina}/${updated.maxStamina}` });

    // const embed = new EmbedBuilder()
    // .setColor(0x00ff00)
    // .setTitle('🗺️ Hasil Eksplorasi')
    // .setDescription(`${interaction.user.username} ${outcome.text} **${outcome.coins} koin** dan **${outcome.exp} EXP**!${levelUpText}`)
    // .setFooter({ text: `Stamina: ${updated.stamina - 10}/${updated.maxStamina}` })
    // .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }
}
