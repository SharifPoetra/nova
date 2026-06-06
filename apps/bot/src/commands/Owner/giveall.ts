import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { OwnerDevCommand } from '../../lib/bases/OwnerDevCommand';
import { BASE_MONSTERS } from '../../lib/rpg/monsters';
import { EXPLORES } from '../../lib/rpg/explorations';
import { FISHES } from '../../lib/rpg/fishes';
import { DUNGEON_DROPS, BOSS_DROPS } from '../../lib/rpg/dungeon/dungeon-data';
import { EQUIPMENTS } from '../../lib/rpg/equipments';
import { COOKED_ITEMS } from '../../lib/rpg/cooking-recipes';
import { CRAFTING_RECIPES } from '../../lib/rpg/crafting-recipes';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions({
  name: 'giveall',
  description: 'Give all available items (Owner only)',
})
export class GiveAllCommand extends OwnerDevCommand {
  protected configure(builder: SlashCommandBuilder) {
    return builder
      .setName(this.name)
      .setDescription(this.description)
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addUserOption((o) => o.setName('target').setDescription('User').setRequired(false))
      .addIntegerOption((o) =>
        o.setName('qty').setDescription('Jumlah').setMinValue(1).setMaxValue(999).setRequired(false),
      );
  }

  public async chatInputRun(i: Command.ChatInputCommandInteraction) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const t = await fetchT(i);
    const target = i.options.getUser('target') ?? i.user;
    const qty = i.options.getInteger('qty') ?? 99;
    const map = new Map<string, any>();

    const add = (d: any) => {
      if (!d?.id && !d?.itemId) return;
      const id = d.id ?? d.itemId;
      if (map.has(id)) return; // skip duplikat

      map.set(id, {
        itemId: id,
        name: d.name ?? id,
        emoji: d.emoji ?? '📦',
        rarity: d.rarity ?? 'Common',
        sellPrice: d.sellPrice ?? 1,
        type: d.type ?? (d.slot ? 'equipment' : 'material'),
        description: d.description ?? '',
        effects: d.effects || (d.effect ? [{ type: d.effect, value: d.effectValue || 0 }] : []),
        slot: d.slot,
        stats: d.stats,
      });
    };

    // 1. Hunt drops
    BASE_MONSTERS.forEach((m) => m.drops.forEach(add));
    // 2. Explore drops
    EXPLORES.forEach((e) => e.item && add(e.item));
    // 3. Fish
    FISHES.forEach((f) => add({ ...f, type: 'material', description: `Ikan ${f.id}` }));
    // 4. Dungeon drops
    Object.values(DUNGEON_DROPS).flat().forEach(add);
    Object.values(BOSS_DROPS).flat().forEach(add);
    // 5. Equipments
    Object.values(EQUIPMENTS).forEach(add);
    // 6. Cooked items
    COOKED_ITEMS.forEach(add);
    // 7. Craft results (biar kebikin di DB juga)
    CRAFTING_RECIPES.forEach((r) => add({ id: r.result.itemId, emoji: r.emoji, type: 'equipment' }));

    const ALL = [...map.values()];

    // upsert ke DB
    for (const it of ALL) {
      await this.container.db.item.updateOne({ itemId: it.itemId }, { $set: it }, { upsert: true });
    }

    const user = await this.container.db.user.findOne({ discordId: target.id });
    if (!user) return i.editReply(t('commands/giveall:no_start'));

    user.items = ALL.map((x) => ({ itemId: x.itemId, qty }));
    await user.save();
    return i.editReply(t('commands/giveall:success', { username: target.username, count: ALL.length, qty }));
  }
}
