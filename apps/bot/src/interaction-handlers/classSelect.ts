import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ButtonInteraction, EmbedBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.Button,
})
export class ClassSelectHandler extends InteractionHandler {
  public override parse(i) {
    return i.isButton() && i.customId.startsWith('class_') ? this.some() : this.none();
  }

  public async run(i: ButtonInteraction) {
    const [, key, ownerId] = i.customId.split('_');

    if (i.user.id !== ownerId) {
      return i.reply({
        content: '😅 Hei, ini bukan tombol kamu! Ketik `/start` aja.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const exists = await this.container.db.user.findOne({ discordId: ownerId });
    if (exists?.class) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: i.user.username,
          iconURL: i.user.displayAvatarURL(),
        })
        .setTitle('😅 Kamu Sudah Punya Class')
        .setDescription(
          `Kamu sudah terdaftar sebagai **${exists.class.charAt(0).toUpperCase() + exists.class.slice(1)}**.\n` +
            `Class tidak bisa diganti, jadi lanjutkan aja petualanganmu!`,
        )
        .setColor(0x95a5a6)
        .setFooter({ text: 'Gunakan /profile untuk melihat status' });
      return i.update({ embeds: [embed], components: [] });
    }

    const classes = {
      warrior: {
        name: 'Warrior',
        emoji: '⚔️',
        hp: 120,
        atk: 15,
        stamina: 120,
        color: 0xe74c3c,
        desc: 'Tahan banting, cocok buat main aman.',
      },
      mage: {
        name: 'Mage',
        emoji: '🪄',
        hp: 80,
        atk: 25,
        stamina: 80,
        color: 0x3498db,
        desc: 'Damage meledak, tapi stamina tipis.',
      },
      rogue: {
        name: 'Rogue',
        emoji: '🏹',
        hp: 100,
        atk: 18,
        stamina: 100,
        color: 0x2ecc71,
        desc: 'Lincah, crit sering keluar.',
      },
    };
    const data = classes[key as keyof typeof classes];

    await this.container.db.user.findOneAndUpdate(
      { discordId: ownerId },
      {
        $set: {
          class: key,
          username: i.user.username,
          hp: data.hp,
          maxHp: data.hp,
          attack: data.atk,
          maxStamina: data.stamina,
          stamina: data.stamina,
          level: 1,
          exp: 0,
          balance: 1000,
          bank: 0,
          items: [],
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${i.user.username} memilih ${data.name}`,
        iconURL: i.user.displayAvatarURL(),
      })
      .setTitle(`${data.emoji} ${data.name} Telah Terbangun!`)
      .setDescription(
        `*${data.desc}*\n\n` + `Selamat datang di Nova Chronicles. Perjalananmu baru dimulai.`,
      )
      .addFields(
        { name: '❤️ HP', value: `**${data.hp}**`, inline: true },
        { name: '🗡️ ATK', value: `**${data.atk}**`, inline: true },
        { name: '⚡ Stamina', value: `**${data.stamina}**`, inline: true },
        { name: '💰 Modal Awal', value: '**1.000** koin', inline: true },
      )
      .setColor(data.color)
      .setFooter({ text: 'Tip: /profile untuk status • /hunt untuk berburu' })
      .setTimestamp();

    await i.update({ embeds: [embed], components: [] });
  }
}
