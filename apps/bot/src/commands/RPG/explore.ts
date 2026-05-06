import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { User } from '@nova/db';
import { checkLevelUp } from '../../lib/rpg/leveling.js';

@ApplyOptions<Command.Options>({
  name: 'explore',
  description: 'Jelajahi dunia Nova dan temukan harta karun'
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
      { text: 'menemukan peti harta karun berisi', coins: 500, exp: 50 },
      { text: 'mengalahkan slime dan mendapatkan', coins: 200, exp: 30 },
      { text: 'menemukan koin di jalan', coins: 100, exp: 20 },
      { text: 'tersesat dan hanya menemukan', coins: 50, exp: 10 },
      { text: 'menemukan dungeon tersembunyi!', coins: 1000, exp: 100 }
    ];
    const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];

    await User.updateOne(
      { discordId: interaction.user.id },
      {
        $inc: { balance: outcome.coins, exp: outcome.exp, stamina: -10 },
        $set: { lastExplore: new Date() }
      }
    );

    const updated = await User.findOne({ discordId: interaction.user.id });
    if (!updated) return;

    let levelUpText = '';
    const levelData = checkLevelUp(updated);
    if (levelData) {
      await User.updateOne(
        { discordId: interaction.user.id },
        { $set: {
            level: levelData.level,
            exp: levelData.expLeft,
            maxHp: levelData.maxHp,
            hp: levelData.hp,
            attack: levelData.attack,
            maxStamina: levelData.maxStamina,
            stamina: levelData.stamina
        }}
      );
      levelUpText = `\n\n🎉 **LEVEL UP!** Kamu sekarang Level ${levelData.level}! +20 HP, +3 ATK, +10 Stamina`;
    }

    const embed = new EmbedBuilder()
     .setColor(0x00ff00)
     .setTitle('🗺️ Hasil Eksplorasi')
     .setDescription(`${interaction.user.username} ${outcome.text} **${outcome.coins} koin** dan **${outcome.exp} EXP**!${levelUpText}`)
     .setFooter({ text: `Stamina: ${updated.stamina - 10}/${updated.maxStamina}` })
     .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description)
    );
  }
}
