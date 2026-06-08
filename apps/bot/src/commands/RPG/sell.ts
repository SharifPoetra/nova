import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
  ModalBuilder,
  MessageFlags,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT, type TFunction } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs.ts';
import { getItemDisplay } from '../../lib/i18n/item-registry.ts';

import sellEn from '../../locales/en-US/commands/sell.json' with { type: 'json' };
import sellId from '../../locales/id/commands/sell.json' with { type: 'json' };

const sanitizeEmoji = (e?: string) => e?.match(/\p{Extended_Pictographic}/u)?.[0];

@ApplyOptions<Command.Options>({
  name: 'sell',
  description: 'Sell fish/materials',
  fullCategory: ['RPG'],
})
export class SellCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:sell', 'commands/descriptions:sell').addStringOption((o) =>
        o
          .setName('type')
          .setDescription(sellEn.option_desc)
          .setDescriptionLocalizations({ id: sellId.option_desc, 'en-US': sellEn.option_desc })
          .setRequired(false)
          .addChoices(
            { name: sellEn.choice_all, value: 'all', name_localizations: { id: sellId.choice_all } },
            { name: 'Common', value: 'Common', name_localizations: { id: 'Common' } },
            { name: 'Uncommon', value: 'Uncommon', name_localizations: { id: 'Uncommon' } },
            { name: 'Rare', value: 'Rare', name_localizations: { id: 'Rare' } },
            { name: 'Epic', value: 'Epic', name_localizations: { id: 'Epic' } },
            { name: 'Legendary', value: 'Legendary', name_localizations: { id: 'Legendary' } },
          ),
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();
    const type = interaction.options.getString('type') ?? 'select';
    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) return interaction.editReply({ content: t('common:need_start') });

    applyPassiveRegen(user);

    if (!user.items?.length) {
      await user.save();
      return interaction.editReply({ content: t('commands/sell:empty') });
    }

    const itemIds = user.items.map((i) => i.itemId);
    const dbItems = await this.container.db.item.find({ itemId: { $in: itemIds } });
    const itemMap = new Map(dbItems.map((i) => [i.itemId, i]));

    let items = user.items
      .map((ui) => ({ itemId: ui.itemId, qty: ui.qty, data: itemMap.get(ui.itemId) }))
      .filter((ui) => ui.data);

    if (type !== 'all' && type !== 'select') {
      items = items.filter((i) => i.data!.rarity === type);
    } else if (type === 'all') {
      items = items.filter((i) => i.data!.rarity !== 'Legendary');
    }

    if (!items.length) {
      await user.save();
      return interaction.editReply({ content: t('commands/sell:none') });
    }

    if (type === 'select') {
      const displays = await Promise.all(items.slice(0, 25).map((i) => getItemDisplay(i.itemId, t)));
      const select = new StringSelectMenuBuilder()
        .setCustomId('sell_select')
        .setPlaceholder(t('commands/sell:placeholder_select'))
        .setMinValues(1)
        .setMaxValues(Math.min(items.length, 25))
        .addOptions(
          items.slice(0, 25).map((it, idx) => {
            const disp = displays[idx];
            const name = disp?.name ?? it.itemId;
            return {
              label: `${name} x${it.qty}`.slice(0, 100),
              value: it.itemId,
              description: `${it.data!.rarity} • ${it.data!.sellPrice} ${t('common:resource.coins')}`.slice(0, 100),
              emoji: sanitizeEmoji(it.data!.emoji),
            };
          }),
        );

      const container = new ContainerBuilder()
        .setAccentColor(0x3498db)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${t('commands/sell:title_select')}\n${t('commands/sell:desc_select')}`,
          ),
        )
        .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));

      await interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2,
      });

      const msg = await interaction.fetchReply();
      const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.StringSelect,
        time: 60000,
        filter: (i) => i.user.id === interaction.user.id,
        max: 1,
      });

      collector.on('collect', async (i) => {
        await i.deferUpdate();
        const selectedIds = i.values;
        const selectedItems = items.filter((it) => selectedIds.includes(it.itemId));
        const sellCart = new Map<string, number>();
        selectedItems.forEach((it) => sellCart.set(it.itemId, it.qty));
        await this.showSellConfirmation(interaction, user, selectedItems, sellCart, t);
      });
      return;
    }

    const sellCart = new Map(items.map((i) => [i.itemId, i.qty]));
    await this.showSellConfirmation(interaction, user, items, sellCart, t);
  }

  private async showSellConfirmation(
    interaction: Command.ChatInputCommandInteraction,
    user: any,
    items: any[],
    sellCart: Map<string, number>,
    t: TFunction,
  ) {
    const ITEMS_PER_PAGE = 10;
    let page = 0;
    let sold = false;
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    const displays = await Promise.all(items.map((i) => getItemDisplay(i.itemId, t)));
    const displayMap = new Map(items.map((i, idx) => [i.itemId, displays[idx]]));

    const calcTotal = () =>
      items.reduce((sum, it) => sum + (sellCart.get(it.itemId) ?? 0) * Number(it.data!.sellPrice), 0);

    const buildContainer = (pageNum: number) => {
      const start = pageNum * ITEMS_PER_PAGE;
      const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
      const total = calcTotal();

      const lines = pageItems.map((it) => {
        const disp = displayMap.get(it.itemId);
        const name = disp?.name ?? it.itemId;
        const qty = sellCart.get(it.itemId) ?? 0;
        const value = qty * Number(it.data!.sellPrice);
        return `${it.data!.emoji} **${name}** x${qty} — ${value.toLocaleString(interaction.locale)} ${t('common:resource.coins')}`;
      });

      const title = sold ? t('commands/sell:title_sold') : t('commands/sell:title_confirm');
      const container = new ContainerBuilder().setAccentColor(sold ? 0x2ecc71 : 0xe67e22);

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(lines.join('\n') || t('commands/sell:none')),
      );
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

      // Total section with button inside
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `**${t('commands/sell:total')}**\n+${total.toLocaleString(interaction.locale)} ${t('common:resource.coins')}\n**${t('commands/sell:items')}**\n${items.length} ${t('commands/sell:types')}`,
            ),
          )
          .setButtonAccessory(
            new ButtonBuilder()
              .setCustomId('sell_confirm')
              .setLabel(t('commands/sell:confirm_yes'))
              .setStyle(ButtonStyle.Success)
              .setEmoji('💰')
              .setDisabled(sold || total === 0),
          ),
      );

      if (totalPages > 1) {
        container.addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `-# ${sold ? t('commands/sell:page_sold', { page: pageNum + 1, total: totalPages }) : t('commands/sell:page', { page: pageNum + 1, total: totalPages })}`,
          ),
        );
      }

      // Navigation + cancel + edit select
      const navRow = new ActionRowBuilder<ButtonBuilder>();
      if (totalPages > 1) {
        navRow.addComponents(
          new ButtonBuilder()
            .setCustomId('sell_prev')
            .setLabel('◀')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNum <= 0),
          new ButtonBuilder()
            .setCustomId('sell_next')
            .setLabel('▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(pageNum >= totalPages - 1),
        );
      }
      navRow.addComponents(
        new ButtonBuilder()
          .setCustomId('sell_cancel')
          .setLabel(t('commands/sell:confirm_no'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(sold),
      );
      container.addActionRowComponents(navRow);

      if (!sold) {
        const pageItemsForSelect = items.slice(start, start + ITEMS_PER_PAGE);
        const qtySelect = new StringSelectMenuBuilder()
          .setCustomId('sell_edit_select')
          .setPlaceholder(t('commands/sell:edit_placeholder', { page: pageNum + 1 }))
          .addOptions(
            pageItemsForSelect.map((it) => {
              const disp = displayMap.get(it.itemId);
              const name = disp?.name ?? it.itemId;
              const current = sellCart.get(it.itemId) ?? 0;
              return {
                label: `${name}`.slice(0, 100),
                value: it.itemId,
                description: t('commands/sell:current', { cur: current, max: it.qty }).slice(0, 100),
                emoji: sanitizeEmoji(it.data!.emoji),
              };
            }),
          );
        container.addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(qtySelect));
      }

      return container;
    };

    await interaction.editReply({
      components: [buildContainer(page)],
      flags: MessageFlags.IsComponentsV2,
    });
    const msg = await interaction.fetchReply();

    const collector = msg.createMessageComponentCollector({
      time: 120000,
      filter: (i) => i.user.id === interaction.user.id,
    });

    collector.on('collect', async (i) => {
      try {
        if (i.isButton()) {
          if (i.customId === 'sell_prev') {
            await i.deferUpdate();
            page = Math.max(0, page - 1);
            await interaction.editReply({ components: [buildContainer(page)], flags: MessageFlags.IsComponentsV2 });
            return;
          }
          if (i.customId === 'sell_next') {
            await i.deferUpdate();
            page = Math.min(totalPages - 1, page + 1);
            await interaction.editReply({ components: [buildContainer(page)], flags: MessageFlags.IsComponentsV2 });
            return;
          }
          if (i.customId === 'sell_cancel') {
            await i.deferUpdate();

            const cancelContainer = new ContainerBuilder()
              .setAccentColor(0x95a5a6)
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${t('commands/sell:cancelled')}`));

            await interaction.editReply({
              components: [cancelContainer],
              flags: MessageFlags.IsComponentsV2,
            });
            collector.stop();
            return;
          }
          if (i.customId === 'sell_confirm') {
            await i.deferUpdate();
            for (const it of items) {
              const qty = sellCart.get(it.itemId) ?? 0;
              if (qty <= 0) continue;
              const idx = user.items.findIndex((ui: any) => ui.itemId === it.itemId);
              if (idx !== -1) {
                user.items[idx].qty -= qty;
                if (user.items[idx].qty <= 0) user.items.splice(idx, 1);
              }
            }
            user.balance = Number(user.balance) + calcTotal();
            await user.save();
            sold = true;
            await interaction.editReply({ components: [buildContainer(page)], flags: MessageFlags.IsComponentsV2 });
          }
        }

        if (i.isStringSelectMenu() && i.customId === 'sell_edit_select') {
          const itemId = i.values[0];
          const item = items.find((it) => it.itemId === itemId);
          if (!item) {
            await i.reply({ content: t('commands/sell:not_found'), flags: MessageFlags.Ephemeral });
            return;
          }
          const disp = displayMap.get(itemId);
          const textInput = new TextInputBuilder()
            .setCustomId('qty')
            .setStyle(TextInputStyle.Short)
            .setValue(String(sellCart.get(itemId) ?? item.qty))
            .setRequired(true)
            .setMinLength(1)
            .setMaxLength(6);
          const label = new LabelBuilder()
            .setLabel(t('commands/sell:max_label', { max: item.qty }).slice(0, 45))
            .setTextInputComponent(textInput);
          const modal = new ModalBuilder()
            .setCustomId(`sell_qty_${itemId}`)
            .setTitle(t('commands/sell:set_title', { name: disp?.name ?? itemId }).slice(0, 45))
            .addLabelComponents(label);

          await i.showModal(modal);
          const submitted = await i
            .awaitModalSubmit({
              time: 60000,
              filter: (m) => m.user.id === interaction.user.id && m.customId === `sell_qty_${itemId}`,
            })
            .catch(() => null);
          if (submitted) {
            const qty = Math.max(0, Math.min(item.qty, parseInt(submitted.fields.getTextInputValue('qty')) || 0));
            sellCart.set(itemId, qty);
            await submitted.deferUpdate();
            await interaction.editReply({ components: [buildContainer(page)], flags: MessageFlags.IsComponentsV2 });
          }
        }
      } catch (e) {
        this.container.logger.error(e);
      }
    });
  }
}
