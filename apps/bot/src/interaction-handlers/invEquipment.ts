import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { MessageFlags } from 'discord.js';
import type { ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { applyPassiveRegen } from '../lib/rpg/buffs';
import { getPlayerStats } from '../lib/rpg/combat';
import { renderInventoryPage, renderEquipmentPage } from '../lib/rpg/inventory';
import type { EquipmentSlot, IUser, IItem } from '@nova/db';
import { getItemDisplay } from '../lib/i18n/item-registry';
import { fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<InteractionHandler.Options>({
  name: 'invEquipment',
  interactionHandlerType: InteractionHandlerTypes.MessageComponent,
})
export class InvEquipmentHandler extends InteractionHandler {
  public override parse(i) {
    return i.customId?.startsWith('inv_equip_') ||
      i.customId?.startsWith('inv_unequip_') ||
      i.customId?.startsWith('inv_back_')
      ? this.some()
      : this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    const t = await fetchT(interaction);
    const parts = interaction.customId.split('_');
    const userId = interaction.customId.startsWith('inv_back_') ? parts[2] : parts[3];

    if (interaction.user.id !== userId)
      return interaction.reply({
        content: t('commands/inventory:not_yours', { defaultValue: 'Not yours' }),
        flags: MessageFlags.Ephemeral,
      });

    const user = await this.container.db.user.findOne({ discordId: userId });
    if (!user) return;
    applyPassiveRegen(user);

    // BACK TO MAIN INVENTORY
    if (interaction.customId.startsWith('inv_back_')) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      const { embed, components } = await renderInventoryPage(
        this.container,
        {
          ...user.toObject(),
          discordId: userId,
          username: interaction.user.username,
          avatar: interaction.user.displayAvatarURL(),
        },
        0,
        t,
        undefined,
      );

      this.container.invCache?.set(interaction.message.id, {
        type: 'main',
        page: 0,
        userId,
        t: Date.now(),
      });

      return interaction.editReply({ embeds: [embed], components });
    }

    // VIEW EQUIPMENT PAGE
    if (interaction.customId.startsWith('inv_equip_view_')) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }
      return this.renderEquip(interaction, user, t);
    }

    // EQUIP ITEM
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_equip_select_')) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }

      const [slot, itemId] = interaction.values[0].split(':') as [EquipmentSlot, string];
      const item = await this.container.db.item.findOne({ itemId });

      if (!item || item.slot !== slot) {
        return interaction.followUp({
          content: t('commands/equipment:invalid', { defaultValue: 'Invalid item' }),
          flags: MessageFlags.Ephemeral,
        });
      }

      const error = this.validateEquip(user, item, slot, t);
      if (error) {
        return interaction.followUp({
          content: `❌ ${error}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const beforeStats = await getPlayerStats(user);
      const wasFullHp = user.hp >= beforeStats.maxHp;

      if (!user.equipped) {
        user.equipped = { weapon: null, helmet: null, armor: null, accessory: null, tool: null };
      }

      const old = user.equipped?.[slot];
      if (old) {
        const inv = user.items.find((i) => i.itemId === old);
        if (inv) inv.qty++;
        else user.items.push({ itemId: old, qty: 1 });
      }

      user.equipped[slot] = itemId;
      user.markModified('equipped');

      const invItem = user.items.find((i) => i.itemId === itemId)!;
      invItem.qty--;
      if (invItem.qty <= 0) {
        user.items = user.items.filter((i) => i.itemId !== itemId);
      }

      await user.save();

      const afterStats = await getPlayerStats(user);
      if (wasFullHp) user.hp = afterStats.maxHp;
      else user.hp = Math.min(user.hp, afterStats.maxHp);
      await user.save();

      const display = await getItemDisplay(itemId, t);
      const name = display?.name ?? itemId;
      const slotLabel = t(`commands/equipment:slot.${slot}`, { defaultValue: slot });

      await interaction.followUp({
        content: t('commands/equipment:equipped', {
          emoji: item.emoji,
          name,
          slot: slotLabel,
          defaultValue: `✅ Equipped ${item.emoji} **${name}** → ${slotLabel}`,
        }),
        flags: MessageFlags.Ephemeral,
      });

      return this.renderEquip(interaction, user, t);
    }

    // UNEQUIP ITEM
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('inv_unequip_select_')) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferUpdate();
      }

      const slot = interaction.values[0] as EquipmentSlot;
      const itemId = user.equipped?.[slot];

      if (!itemId) {
        return interaction.followUp({
          content: t('commands/equipment:empty', { defaultValue: 'Slot is empty' }),
          flags: MessageFlags.Ephemeral,
        });
      }

      const beforeStats = await getPlayerStats(user);
      const wasFullHp = user.hp >= beforeStats.maxHp;

      const inv = user.items.find((i) => i.itemId === itemId);
      if (inv) inv.qty++;
      else user.items.push({ itemId, qty: 1 });

      user.equipped[slot] = null;
      user.markModified('equipped');
      await user.save();

      const afterStats = await getPlayerStats(user);
      if (wasFullHp) user.hp = afterStats.maxHp;
      else user.hp = Math.min(user.hp, afterStats.maxHp);
      if (user.hp < 0) user.hp = 0;
      await user.save();

      const slotLabel = t(`commands/equipment:slot.${slot}`, { defaultValue: slot });

      await interaction.followUp({
        content: t('commands/equipment:unequipped', {
          slot: slotLabel,
          defaultValue: `📤 Unequipped ${slotLabel}`,
        }),
        flags: MessageFlags.Ephemeral,
      });

      return this.renderEquip(interaction, user, t);
    }
  }

  private validateEquip(user: IUser, item: IItem, slot: EquipmentSlot, t: any): string | null {
    if (item.type !== 'equipment') {
      return t('commands/equipment:not_equip', { defaultValue: 'Item ini bukan equipment' });
    }
    if (item.slot !== slot) {
      return t('commands/equipment:wrong_slot', {
        slot: item.slot,
        need: slot,
        defaultValue: `Item ini slot ${item.slot}, bukan ${slot}`,
      });
    }
    if (item.stats?.classLock?.length) {
      if (user.class && !item.stats?.classLock?.includes(user.class)) {
        return t('commands/equipment:class_lock', {
          classes: item.stats.classLock.join('/'),
          defaultValue: `Hanya class ${item.stats.classLock.join('/')} yang bisa equip ini`,
        });
      }
    }
    return null;
  }

  private async renderEquip(interaction: any, user: any, t: any) {
    const renderUser = {
      ...user.toObject(),
      discordId: user.discordId,
      username: interaction.user.username,
      avatar: interaction.user.displayAvatarURL(),
    };

    const page = Number(interaction.customId.split('_')[4] || 0);

    const { embed, components } = await renderEquipmentPage(this.container, renderUser, page, t);

    this.container.invCache?.set(interaction.message.id, {
      type: 'equipment',
      page,
      userId: user.discordId,
      t: Date.now(),
    });

    return interaction.editReply({ embeds: [embed], components });
  }
}
