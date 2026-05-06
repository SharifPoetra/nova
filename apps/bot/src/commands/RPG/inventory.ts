import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
const RARITY_COLOR = {
  Legendary: 0xf1c40f,
  Epic: 0x9b59b6,
  Rare: 0x3498db,
  Uncommon: 0x2ecc71,
  Common: 0x95a5a6,
};

@ApplyOptions<Command.Options>({
  name: 'inventory',
  description: 'Lihat semua item kamu',
  fullCategory: ['RPG'],
})
export class InventoryCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('Gunakan /start dulu!');

    if (!user.items.length) {
      return interaction.editReply('📦 Inventory kosong. Coba /fish atau /explore!');
    }

    // ambil data item dari DB
    const itemIds = user.items.map((i) => i.itemId);
    const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } });
    const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));

    let totalValue = 0;
    const grouped: Record<string, string[]> = {};

    for (const inv of user.items) {
      const data = itemMap.get(inv.itemId);
      if (!data) continue;
      const rarity = data.rarity || 'Common';
      const line = `${data.emoji} **${data.name}** x${inv.qty} — ${data.sellPrice * inv.qty} koin`;
      totalValue += data.sellPrice * inv.qty;
      if (!grouped[rarity]) grouped[rarity] = [];
      grouped[rarity].push(line);
    }

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.username}'s Inventory`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setColor(
        RARITY_COLOR[grouped['Legendary'] ? 'Legendary' : grouped['Epic'] ? 'Epic' : 'Rare'],
      )
      .setFooter({ text: `Total nilai jual: ${totalValue} koin | Gunakan /sell untuk jual` });

    for (const rarity of RARITY_ORDER) {
      if (grouped[rarity]?.length) {
        embed.addFields({ name: `${rarity}`, value: grouped[rarity].join('\n'), inline: false });
      }
    }

    return interaction.editReply({ embeds: [embed] });
  }
}
