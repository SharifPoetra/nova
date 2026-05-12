import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { RARITY_COLOR } from '../../lib/utils';

const RARITY_ORDER = ['Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'] as const;

type GroupedItem = {
  text: string;
  sub: string;
  value: number;
};

@ApplyOptions<Command.Options>({
  name: 'inventory',
  description: 'Lihat semua item kamu',
  detailedDescription: {
    usage: '/inventory',
    examples: ['/inventory'],
    extendedHelp: `
Lihat semua bahan dan drop yang kamu punya.

**Fitur:**
- Item dikelompokkan berdasarkan rarity (Legendary → Common)
- Menampilkan jumlah, nilai jual, dan deskripsi
- Warna embed otomatis ikut rarity tertinggi
- Update stamina pasif saat buka

**Gunakan untuk:**
- Cek bahan sebelum /cook
- Hitung total aset sebelum /sell
- Pastikan stok ikan/daging/herb cukup

Tip: item dari /fish, /hunt, dan /explore otomatis masuk ke sini.
    `.trim(),
  },
  fullCategory: ['RPG'],
})
export class InventoryCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    await interaction.deferReply();
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply('❌ Gunakan /start dulu!');

    applyPassiveRegen(user);
    await user.save();

    if (!user.items?.length) {
      return interaction.editReply('📦 Inventory kosong. Coba /fish atau /explore!');
    }

    const itemIds = user.items.map((i) => i.itemId);
    const itemsData = await this.container.db.item.find({ itemId: { $in: itemIds } }).lean();
    const itemMap = new Map(itemsData.map((i) => [i.itemId, i]));

    let totalValue = 0;
    const grouped: Record<string, GroupedItem[]> = {};

    for (const inv of user.items) {
      const data = itemMap.get(inv.itemId);
      if (!data) continue;

      const rarity = data.rarity || 'Common';
      const sellPrice = data.sellPrice ?? 0;
      const value = sellPrice * inv.qty;
      totalValue += value;

      if (!grouped[rarity]) grouped[rarity] = [];

      grouped[rarity].push({
        text: `${data.emoji} **${data.name}** x${inv.qty}`,
        sub: `> ${value.toLocaleString('id-ID')} 💰 • ${data.description || 'Tidak ada deskripsi'}`,
        value,
      });
    }

    const topRarity = RARITY_ORDER.find((r) => grouped[r]?.length) || 'Common';

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${interaction.user.username}'s Inventory`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setColor(RARITY_COLOR[topRarity as keyof typeof RARITY_COLOR])
      .setDescription(`⚡ Stamina: ${user.stamina}/${user.maxStamina}`)
      .setFooter({
        text: `Total nilai jual: ${totalValue.toLocaleString('id-ID')} koin | /sell untuk jual`,
      });

    for (const rarity of RARITY_ORDER) {
      const items = grouped[rarity];
      if (!items?.length) continue;

      items.sort((a, b) => b.value - a.value);

      const value = items
        .map((i) => `${i.text}\n${i.sub}`)
        .join('\n')
        .slice(0, 1024);

      embed.addFields({
        name: `${rarity} (${items.length})`,
        value,
        inline: false,
      });
    }

    return interaction.editReply({ embeds: [embed] });
  }
}
