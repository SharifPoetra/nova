import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { sleep, ratioBar, colorBar } from '../../lib/utils';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { checkLevelUp, getScaledExp } from '../../lib/rpg/leveling';
import { ACTION_COST } from '../../lib/rpg/actions';
import {
  getMonster,
  getFloorLore,
  BOSS_DROPS,
  DUNGEON_DROPS,
  DUNGEON_MONSTERS,
  BOSSES,
} from '../../lib/rpg/dungeon/dungeon-data';
import {
  rollEvent,
  getZone,
  type DungeonEvent,
  EVENT_ITEM_DEFS,
} from '../../lib/rpg/dungeon/dungeon-events';
import { createRunState, getCheckpoint, RunState } from '../../lib/rpg/dungeon/dungeon-state';
import {
  buildMainEmbed,
  buildMapEmbed,
  buildFleeEmbed,
  buildRestEmbed,
  buildMerchantEmbed,
  getMainButtons,
  getContinueButtons,
  getMerchantButtons,
} from '../../lib/rpg/dungeon/dungeon-ui';
import { runInteractiveBattle } from '../../lib/rpg/dungeon/dungeon-battle';
import { getPlayerStats } from '../../lib/rpg/combat';
import { addItemToInventory, renderInventoryPage } from '../../lib/rpg/inventory';

@ApplyOptions({
  name: 'dungeon',
  description: 'Tower of Stars - 100 floor dungeon',
  fullCategory: ['RPG'],
})
export class DungeonCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(
        builder,
        'commands/names:dungeon',
        'commands/descriptions:dungeon',
      ).addStringOption((o) =>
        o
          .setName('action')
          .setNameLocalizations({ id: 'aksi' })
          .setDescription('Choose action')
          .setDescriptionLocalizations({ id: 'Pilih aksi', 'en-US': 'Choose action' })
          .setRequired(true)
          .addChoices(
            {
              name: 'Enter',
              value: 'enter',
              name_localizations: { id: 'Masuk', 'en-US': 'Enter' },
            },
            {
              name: 'Status',
              value: 'status',
              name_localizations: { id: 'Status', 'en-US': 'Status' },
            },
            {
              name: 'Leave',
              value: 'leave',
              name_localizations: { id: 'Keluar', 'en-US': 'Leave' },
            },
          ),
      ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const { user: userModel, dungeon: dungeonModel } = this.container.db;
    const action = interaction.options.getString('action', true) as 'enter' | 'status' | 'leave';
    const DUNGEON_COST = ACTION_COST.dungeon;
    let player = await userModel.findOne({ discordId: interaction.user.id });
    if (!player)
      return interaction.reply({ content: t('common:need_start'), flags: MessageFlags.Ephemeral });

    applyPassiveRegen(player);
    await player.save();

    const dungeonData =
      (await dungeonModel.findOne({ discordId: player.discordId })) ??
      (await dungeonModel.create({ discordId: player.discordId }));
    const stats = await getPlayerStats(player);

    if (action === 'status') {
      const lore = getFloorLore(dungeonData.currentFloor);
      const zone = getZone(dungeonData.currentFloor);
      const checkpoint = getCheckpoint(dungeonData.currentFloor);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(t('commands/dungeon:title', { defaultValue: '🗼 Tower of Stars' }))
            .setDescription(
              `
**${t('commands/dungeon:floor_label', { floor: dungeonData.currentFloor })}** • ${zone}
*${lore}*

${t('commands/dungeon:highest')}: ${dungeonData.highestFloor}/100
${t('commands/dungeon:checkpoint')}: ${checkpoint}

HP ${ratioBar(stats.hp, stats.maxHp)} ${stats.hp}/${stats.maxHp}
Stamina ${colorBar(player.stamina, player.maxStamina, 10, '🟨', '⬛')} ${player.stamina}/${player.maxStamina}
${dungeonData.inRun ? t('commands/dungeon:in_run') : ''}
`,
            )
            .setColor(0x9b59b6),
        ],
      });
    }

    if (action === 'leave') {
      dungeonData.inRun = false;
      dungeonData.floorState = null;
      await dungeonData.save();
      return interaction.reply(t('commands/dungeon:left'));
    }

    let currentFloor = dungeonData.currentFloor;
    if (player.stamina < DUNGEON_COST)
      return interaction.reply({
        content: t('common:error.low_stamina', { cost: DUNGEON_COST }),
        flags: MessageFlags.Ephemeral,
      });
    if (stats.hp <= 0)
      return interaction.reply({
        content: t('commands/dungeon:hp_zero'),
        flags: MessageFlags.Ephemeral,
      });

    if (!dungeonData.inRun) {
      dungeonData.inRun = true;
      dungeonData.floorState = createRunState(currentFloor);
      await dungeonData.save();
    }

    let runState = dungeonData.floorState as RunState;
    let zone = getZone(currentFloor);
    let lore = getFloorLore(currentFloor);
    let floorMonster = getMonster(currentFloor);
    let isBossFloor = floorMonster.isBoss;

    const buildEmbed = async (): Promise<EmbedBuilder> => {
      player = (await userModel.findOne({ discordId: interaction.user.id }))!;
      const s = await getPlayerStats(player);
      return buildMainEmbed({
        floor: currentFloor,
        state: runState,
        zone,
        lore,
        playerHp: s.hp,
        playerMaxHp: s.maxHp,
        playerStamina: player.stamina,
        playerMaxStamina: player.maxStamina,
        highestFloor: dungeonData.highestFloor,
        isBoss: isBossFloor,
        t,
      });
    };

    const response = await interaction.reply({
      embeds: [await buildEmbed()],
      components: [getMainButtons(t)],
      withResponse: true,
    });
    const message = response.resource!.message!;
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
      filter: (btn) =>
        btn.user.id === interaction.user.id &&
        ['next', 'map', 'flee', 'continue', 'stop', 'inventory', 'closebag'].includes(btn.customId),
    });

    collector.on('collect', async (button) => {
      await button.deferUpdate();
      player = (await userModel.findOne({ discordId: interaction.user.id }))!;
      const s = await getPlayerStats(player);

      if (button.customId === 'flee') {
        const checkpoint = getCheckpoint(currentFloor);
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        await dungeonData.save();
        collector.stop();
        return button.editReply({
          embeds: [
            buildFleeEmbed({
              lore,
              floor: currentFloor,
              state: runState,
              zone,
              checkpoint,
              playerHp: s.hp,
              playerMaxHp: s.maxHp,
              playerStamina: player.stamina,
              playerMaxStamina: player.maxStamina,
              t,
            }),
          ],
          components: [],
        });
      }
      if (button.customId === 'map') {
        return button.editReply({
          embeds: [
            buildMapEmbed({
              floor: currentFloor,
              state: runState,
              zone,
              lore,
              isBoss: isBossFloor,
              playerHp: s.hp,
              playerMaxHp: s.maxHp,
              t,
            }),
          ],
          components: [getMainButtons(t)],
        });
      }
      if (button.customId === 'inventory') {
        const inv = await renderInventoryPage(
          this.container,
          {
            ...player.toObject(),
            username: interaction.user.username,
            avatar: interaction.user.displayAvatarURL(),
          },
          0,
        );
        const useMenu = inv.components.find((c) => JSON.stringify(c).includes('inv_use_'));
        const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('closebag')
            .setLabel(t('commands/dungeon:close_bag', { defaultValue: '❌ Close Bag' }))
            .setStyle(ButtonStyle.Secondary),
        );
        return button.editReply({
          embeds: [inv.embed.setTitle('🎒 Dungeon Bag').setColor(0x2ecc71)],
          components: useMenu ? [useMenu, closeRow] : [closeRow],
        });
      }
      if (button.customId === 'closebag') {
        return button.editReply({ embeds: [await buildEmbed()], components: [getMainButtons(t)] });
      }
      if (button.customId === 'continue') {
        if (player.stamina < DUNGEON_COST)
          return button.editReply({
            content: t('common:error.low_stamina', { cost: DUNGEON_COST }),
            embeds: [],
            components: [],
          });
        currentFloor = dungeonData.currentFloor;
        floorMonster = getMonster(currentFloor);
        isBossFloor = floorMonster.isBoss;
        zone = getZone(currentFloor);
        lore = getFloorLore(currentFloor);
        dungeonData.inRun = true;
        dungeonData.floorState = createRunState(currentFloor);
        await dungeonData.save();
        runState = dungeonData.floorState as RunState;
        return button.editReply({ embeds: [await buildEmbed()], components: [getMainButtons(t)] });
      }
      if (button.customId === 'stop') {
        collector.stop();
        return button.editReply({
          embeds: [
            buildRestEmbed({
              floor: currentFloor,
              state: runState,
              nextFloor: dungeonData.currentFloor,
              highestFloor: dungeonData.highestFloor,
              t,
            }),
          ],
          components: [],
        });
      }

      if (player.stamina < DUNGEON_COST) {
        runState.log.push(t('commands/dungeon:stamina_out'));
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        await dungeonData.save();
        collector.stop();
        return button.editReply({
          content: t('commands/dungeon:stamina_out'),
          embeds: [await buildEmbed()],
          components: [],
        });
      }

      await userModel.updateOne(
        { discordId: player.discordId },
        { $inc: { stamina: -DUNGEON_COST } },
      );
      runState.current++;

      const isLastRoom = runState.current === runState.rooms;
      let event: DungeonEvent;
      if (isLastRoom && isBossFloor) {
        event = { id: 'boss', type: 'battle', weight: 0, text: `👑 ${floorMonster.name} BOSS!` };
      } else {
        const needForcedBattle = !runState.hasBattle && runState.current >= runState.rooms - 1;
        event = needForcedBattle
          ? { id: 'forced', type: 'battle', weight: 0, text: t('commands/dungeon:forced_battle') }
          : rollEvent(currentFloor);
      }

      let currentMonster: any = null;
      if (event.type === 'battle') {
        runState.hasBattle = true;
        if (isLastRoom && isBossFloor) currentMonster = floorMonster;
        else {
          const base = getMonster(currentFloor).base;
          const bossNames = Object.values(BOSSES).map((b) => b.name);
          const pool = DUNGEON_MONSTERS.filter(
            (m) => m.base === base && !bossNames.includes(m.name),
          );
          currentMonster = {
            ...(pool[Math.floor(Math.random() * pool.length)] ?? getMonster(currentFloor)),
            isBoss: false,
          };
        }
      }
      runState.log.push(
        `**R${runState.current}:** ${event.type === 'battle' ? `${currentMonster.emoji} ${currentMonster.name}` : event.text}`,
      );

      if (event.type === 'battle') {
        const isElite = !isLastRoom && !isBossFloor && Math.random() < 0.1;
        const battleResult = await runInteractiveBattle({
          player,
          monster: currentMonster,
          floor: currentFloor,
          lore,
          isBoss: isLastRoom && isBossFloor,
          isElite,
          state: runState,
          msg: message,
          username: interaction.user.username,
          t,
        });
        player = (await userModel.findOne({ discordId: player.discordId }))!;

        if (!battleResult.victory) {
          runState.log.push(t('commands/dungeon:defeated', { name: currentMonster.name }));
          dungeonData.inRun = false;
          dungeonData.floorState = null;
          dungeonData.currentFloor = getCheckpoint(currentFloor);
          await dungeonData.save();
          collector.stop();
          return button.editReply({
            embeds: [
              (await buildEmbed())
                .setTitle(t('commands/dungeon:lost_title', { floor: currentFloor }))
                .setColor(0xe74c3c),
            ],
            components: [],
          });
        }
        runState.log.push(t('commands/dungeon:victory', { emoji: currentMonster.emoji }));
        const roomGold = 15 + currentFloor * 2 + (isElite ? 25 : 0);
        const baseExp = 5 + currentFloor;
        const roomExp = getScaledExp(baseExp, player.level, 'dungeon', isElite);
        runState.gold += roomGold;
        runState.exp += roomExp;
        await userModel.updateOne(
          { discordId: player.discordId },
          { $inc: { balance: roomGold, exp: roomExp } },
        );

        const isBoss = currentMonster.isBoss ?? false;
        const pool = isBoss
          ? (BOSS_DROPS[currentMonster.base] ?? BOSS_DROPS.guardian)
          : (DUNGEON_DROPS[currentMonster.base] ?? DUNGEON_DROPS.slime);
        const materials = pool.filter((d) => d.type === 'material');
        if (materials.length && Math.random() < (isBoss ? 1.0 : isElite ? 0.75 : 0.4)) {
          const { id, ...matData } = materials[Math.floor(Math.random() * materials.length)];
          await addItemToInventory(
            player.discordId,
            { itemId: id, ...matData },
            isBoss ? 3 : isElite ? 2 : 1,
          );
          runState.log.push(`📦 ${matData.emoji} ${matData.name} x${isBoss ? 3 : isElite ? 2 : 1}`);
        }
        const equipPool = pool.filter((d) => d.type === 'equipment' || d.type === 'consumable');
        if (equipPool.length && Math.random() < (isBoss ? 1.0 : isElite ? 0.4 : 0.2)) {
          const weights = { Common: 60, Uncommon: 25, Rare: 10, Epic: 4, Legendary: 1, Mythic: 0 };
          const weighted = equipPool.flatMap((d) => Array(weights[d.rarity] || 1).fill(d));
          const { id, ...dropData } = weighted[Math.floor(Math.random() * weighted.length)];
          await addItemToInventory(player.discordId, { itemId: id, ...dropData }, 1);
          runState.log.push(
            t('commands/dungeon:drop', { emoji: dropData.emoji, name: dropData.name }),
          );
        }
      } else if (event.type === 'treasure') {
        const gold = event.effect?.gold ?? 50 + currentFloor * 3;
        runState.gold += gold;
        await userModel.updateOne({ discordId: player.discordId }, { $inc: { balance: gold } });
        runState.log.push(t('commands/dungeon:chest', { gold }));
        if (event.effect?.item) {
          const def = EVENT_ITEM_DEFS[event.effect.item] ?? {};
          await addItemToInventory(
            player.discordId,
            {
              itemId: event.effect.item,
              name: def.name ?? event.effect.item,
              emoji: def.emoji ?? '📦',
              description: def.description ?? '',
              type: (def.type ?? 'material') as any,
              rarity: (def.rarity ?? 'Common') as any,
              sellPrice: def.sellPrice ?? 20 + currentFloor,
            },
            1,
          );
          runState.log.push(
            t('commands/dungeon:got_item', {
              emoji: def.emoji ?? '📦',
              name: def.name ?? event.effect.item,
            }),
          );
        }
      } else if (event.type === 'trap') {
        const damage = Math.abs(event.effect?.hp ?? 15 + currentFloor);
        await userModel.updateOne({ discordId: player.discordId }, { $inc: { hp: -damage } });
        runState.taken += damage;
        runState.log.push(t('commands/dungeon:trap', { damage }));
        if (event.effect?.stamina)
          await userModel.updateOne(
            { discordId: player.discordId },
            { $inc: { stamina: event.effect.stamina } },
          );
      } else if (event.type === 'heal') {
        const heal = event.effect?.hp ?? 30;
        const s2 = await getPlayerStats(player);
        const newHp = Math.min(s2.maxHp, player.hp + heal);
        await userModel.updateOne({ discordId: player.discordId }, { $set: { hp: newHp } });
        runState.log.push(t('commands/dungeon:heal', { heal }));
        if (event.effect?.stamina)
          await userModel.updateOne(
            { discordId: player.discordId },
            { $inc: { stamina: event.effect.stamina } },
          );
      } else if (event.type === 'puzzle') {
        if (event.effect?.hp) {
          const s2 = await getPlayerStats(player);
          const newHp = Math.min(s2.maxHp, player.hp + event.effect.hp);
          await userModel.updateOne({ discordId: player.discordId }, { $set: { hp: newHp } });
          runState.log.push(t('commands/dungeon:puzzle_hp', { hp: event.effect.hp }));
        } else {
          const gold = event.effect?.gold ?? 100 + currentFloor * 2;
          runState.gold += gold;
          await userModel.updateOne({ discordId: player.discordId }, { $inc: { balance: gold } });
          runState.log.push(t('commands/dungeon:puzzle_gold', { gold }));
        }
      } else if (event.type === 'lore') {
        const loreExp = 3 + Math.floor(currentFloor / 5);
        await userModel.updateOne(
          { discordId: player.discordId },
          { $inc: { exp: loreExp, stamina: DUNGEON_COST } },
        );
        runState.exp += loreExp;
        runState.log.push(t('commands/dungeon:lore', { text: event.text, exp: loreExp }));
      } else if (event.type === 'merchant') {
        const cost = Math.abs(event.effect?.gold ?? 100) + Math.floor(currentFloor * 2.5);
        const heal = 30 + Math.floor(currentFloor * 1.5);
        player = (await userModel.findOne({ discordId: player.discordId }))!;
        const canAfford = player.balance >= cost;
        await button.editReply({
          embeds: [
            buildMerchantEmbed({
              text: event.text,
              cost,
              heal,
              floor: currentFloor,
              playerGold: player.balance,
              zone,
              t,
            }),
          ],
          components: [getMerchantButtons(cost, canAfford, t)],
        });
        const choice = await message
          .awaitMessageComponent({
            filter: (i) => i.user.id === player!.discordId && ['buy', 'skip'].includes(i.customId),
            time: 20000,
            componentType: ComponentType.Button,
          })
          .catch(() => null);
        if (choice) await choice.deferUpdate();
        if (choice?.customId === 'buy' && player.balance >= cost) {
          const s2 = await getPlayerStats(player);
          const newHp = Math.min(s2.maxHp, player.hp + heal);
          await userModel.updateOne(
            { discordId: player.discordId },
            { $inc: { balance: -cost }, $set: { hp: newHp } },
          );
          runState.log.push(t('commands/dungeon:bought', { heal, cost }));
          await sleep(800);
        } else runState.log.push(t('commands/dungeon:skipped'));
      }

      await dungeonData.save();

      if (runState.current >= runState.rooms) {
        player = (await userModel.findOne({ discordId: player.discordId }))!;

        const floorGold = 50 + currentFloor * 5 + (isBossFloor ? 300 : 0);
        const floorExp = 20 + currentFloor * 2;
        runState.gold += floorGold;
        runState.exp += floorExp;
        await userModel.updateOne(
          { discordId: player.discordId },
          { $inc: { balance: floorGold, exp: floorExp } },
        );
        dungeonData.currentFloor++;
        if (currentFloor > dungeonData.highestFloor) dungeonData.highestFloor = currentFloor;
        const levelUp = checkLevelUp(player);
        if (levelUp) {
          const newStats = await getPlayerStats(player);
          await userModel.updateOne(
            { discordId: player.discordId },
            { $set: { hp: newStats.maxHp, stamina: player.maxStamina } },
          );
          runState.log.push(t('common:levelup', { level: levelUp.level }));
        }
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        dungeonData.lastRun = new Date();
        await dungeonData.save();
        const clearEmbed = (await buildEmbed())
          .setTitle(t('commands/dungeon:clear_title', { floor: currentFloor }))
          .setColor(0x2ecc71)
          .setDescription(
            runState.log.join('\n') +
              `
\n**${t('commands/dungeon:reward', { gold: runState.gold, exp: runState.exp })}**
\n**${t('commands/dungeon:continue_q')}**`,
          );
        return button.editReply({
          embeds: [clearEmbed],
          components: [getContinueButtons(dungeonData.currentFloor, t)],
        });
      }
      await button.editReply({ embeds: [await buildEmbed()], components: [getMainButtons(t)] });
    });

    collector.on('end', async () => {
      await dungeonData.save();
    });
  }
}
