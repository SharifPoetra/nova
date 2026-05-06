import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'inventory',
  description: 'Lihat isi tas petualanganmu',
  fullCategory: ['RPG'],
})
export class InventoryCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Lihat tas orang lain').setRequired(false),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user') ?? interaction.user;
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: target.id });
    if (!user || !user.items?.length) {
      return interaction.editReply(`📦 Tas ${target.username} kosong melompong.`);
    }

    // Ambil detail item dari DB
    const itemIds = user.items.map((i) => i.itemId);
    const itemDefs = await this.container.db.item.find({ itemId: { $in: itemIds } });
    const itemMap = new Map(itemDefs.map((i) => [i.itemId, i]));

    const fields = user.items
      .filter((i) => i.qty > 0)
      .map((i) => {
        const def = itemMap.get(i.itemId);
        if (!def) return null;
        return {
          name: `${def.emoji} ${def.name} ×${i.qty}`,
          value: `*${def.description}*\nJual: ${def.sellPrice} koin`,
          inline: true,
        };
      })
      .filter(Boolean) as any[];

    const embed = new EmbedBuilder()
      .setAuthor({ name: `Tas ${target.username}`, iconURL: target.displayAvatarURL() })
      .setColor(0x9b59b6)
      .setDescription(fields.length ? 'Barang-barang yang kamu kumpulkan:' : 'Kosong.')
      .addFields(fields.length ? fields : [])
      .setFooter({ text: 'Gunakan /use untuk memakai consumable' });

    return interaction.editReply({ embeds: [embed] });
  }
}
