import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ComponentType, EmbedBuilder, MessageFlags } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { sleep, ratioBar, colorBar } from '../../lib/utils';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { checkLevelUp } from '../../lib/rpg/leveling';
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

@ApplyOptions<Command.Options>({
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
      ).addStringOption((option) =>
        option
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
    const { user: userModel, item: itemModel, dungeon: dungeonModel } = this.container.db;
    const action = interaction.options.getString('action', true) as 'enter' | 'status' | 'leave';

    const DUNGEON_COST = ACTION_COST.dungeon;

    const player = await userModel.findOne({ discordId: interaction.user.id });
    if (!player)
      return interaction.reply({
        content: t('common:need_start', { defaultValue: 'Use /start' }),
        flags: MessageFlags.Ephemeral,
      });

    applyPassiveRegen(player);

    const dungeonData =
      (await dungeonModel.findOne({ discordId: player.discordId })) ??
      (await dungeonModel.create({ discordId: player.discordId }));

    if (action === 'status') {
      await player.save();
      const lore = getFloorLore(dungeonData.currentFloor);
      const zone = getZone(dungeonData.currentFloor);
      const checkpoint = getCheckpoint(dungeonData.currentFloor);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(t('commands/dungeon:title', { defaultValue: '🗼 Tower of Stars' }))
            .setDescription(
              `**${t('commands/dungeon:floor_label', { floor: dungeonData.currentFloor, defaultValue: `Floor ${dungeonData.currentFloor}` })}** • ${zone}
*${lore}*

` +
                `${t('commands/dungeon:highest', { defaultValue: 'Highest' })}: ${dungeonData.highestFloor}/100
${t('commands/dungeon:checkpoint', { defaultValue: 'Checkpoint' })}: ${checkpoint}
` +
                `HP ${ratioBar(player.hp, player.maxHp)} ${player.hp}/${player.maxHp}
` +
                `Stamina ${colorBar(player.stamina, player.maxStamina, 10, '🟨', '⬛')} ${player.stamina}/${player.maxStamina}
` +
                `${dungeonData.inRun ? t('commands/dungeon:in_run', { defaultValue: '⚠️ Currently in a run!' }) : ''}`,
            )
            .setColor(0x9b59b6),
        ],
      });
    }

    if (action === 'leave') {
      dungeonData.inRun = false;
      dungeonData.floorState = null;
      await dungeonData.save();
      return interaction.reply(
        t('commands/dungeon:left', { defaultValue: 'Left tower. Run cancelled.' }),
      );
    }

    let currentFloor = dungeonData.currentFloor;

    if (player.stamina < DUNGEON_COST)
      return interaction.reply({
        content: t('commands/dungeon:low_stamina', {
          cost: DUNGEON_COST,
          defaultValue: `⚡ Stamina <${DUNGEON_COST}`,
        }),
        flags: MessageFlags.Ephemeral,
      });
    if (player.hp <= 0)
      return interaction.reply({
        content: t('commands/dungeon:hp_zero', { defaultValue: '❤️ HP 0' }),
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

    const buildEmbed = () =>
      buildMainEmbed({
        floor: currentFloor,
        state: runState,
        zone,
        lore,
        playerHp: player.hp,
        playerMaxHp: player.maxHp,
        playerStamina: player.stamina,
        playerMaxStamina: player.maxStamina,
        highestFloor: dungeonData.highestFloor,
        isBoss: isBossFloor,
        t,
      });

    const response = await interaction.reply({
      embeds: [buildEmbed()],
      components: [getMainButtons(t)],
      withResponse: true,
    });
    const message = response.resource!.message!;

    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
      filter: (btn) =>
        btn.user.id === interaction.user.id &&
        ['next', 'map', 'flee', 'continue', 'stop'].includes(btn.customId),
    });

    collector.on('collect', async (button) => {
      await button.deferUpdate();

      if (button.customId === 'flee') {
        const checkpoint = getCheckpoint(currentFloor);
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        await dungeonData.save();
        await player.save();
        collector.stop();

        const fleeEmbed = buildFleeEmbed({
          lore,
          floor: currentFloor,
          state: runState,
          zone,
          checkpoint,
          playerHp: player.hp,
          playerMaxHp: player.maxHp,
          playerStamina: player.stamina,
          playerMaxStamina: player.maxStamina,
          t,
        });
        return button.editReply({ embeds: [fleeEmbed], components: [] });
      }

      if (button.customId === 'map') {
        const mapEmbed = buildMapEmbed({
          floor: currentFloor,
          state: runState,
          zone,
          lore,
          isBoss: isBossFloor,
          playerHp: player.hp,
          playerMaxHp: player.maxHp,
          t,
        });
        return button.editReply({ embeds: [mapEmbed], components: [getMainButtons(t)] });
      }

      if (button.customId === 'continue') {
        if (player.stamina < DUNGEON_COST)
          return button.editReply({
            content: t('commands/dungeon:low_stamina', { cost: DUNGEON_COST }),
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
        return button.editReply({ embeds: [buildEmbed()], components: [getMainButtons(t)] });
      }

      if (button.customId === 'stop') {
        collector.stop();
        const restEmbed = buildRestEmbed({
          floor: currentFloor,
          state: runState,
          nextFloor: dungeonData.currentFloor,
          highestFloor: dungeonData.highestFloor,
          t,
        });
        return button.editReply({ embeds: [restEmbed], components: [] });
      }

      if (player.stamina < DUNGEON_COST) {
        runState.log.push(
          t('commands/dungeon:stamina_out', { defaultValue: '⚡ Out of stamina!' }),
        );
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        await dungeonData.save();
        collector.stop();
        return button.editReply({
          content: t('commands/dungeon:stamina_out'),
          embeds: [buildEmbed()],
          components: [],
        });
      }

      player.stamina -= DUNGEON_COST;
      runState.current++;
      const isLastRoom = runState.current === runState.rooms;

      let event: DungeonEvent;
      if (isLastRoom && isBossFloor) {
        event = { id: 'boss', type: 'battle', weight: 0, text: `👑 ${floorMonster.name} BOSS!` };
      } else {
        const needForcedBattle = !runState.hasBattle && runState.current >= runState.rooms - 1;
        event = needForcedBattle
          ? {
              id: 'forced',
              type: 'battle',
              weight: 0,
              text: t('commands/dungeon:forced_battle', { defaultValue: 'Enemy blocks the way!' }),
            }
          : rollEvent(currentFloor);
      }

      let currentMonster: any = null;
      if (event.type === 'battle') {
        runState.hasBattle = true;
        if (isLastRoom && isBossFloor) {
          currentMonster = floorMonster;
        } else {
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

        if (!battleResult.victory) {
          runState.log.push(
            t('commands/dungeon:defeated', {
              name: currentMonster.name,
              defaultValue: `💀 Defeated by ${currentMonster.name}!`,
            }),
          );
          dungeonData.inRun = false;
          dungeonData.floorState = null;
          const checkpoint = getCheckpoint(currentFloor);
          dungeonData.currentFloor = checkpoint;
          await dungeonData.save();
          await player.save();
          collector.stop();

          return button.editReply({
            embeds: [
              buildEmbed()
                .setTitle(
                  t('commands/dungeon:lost_title', {
                    floor: currentFloor,
                    defaultValue: `💀 Lost Floor ${currentFloor}`,
                  }),
                )
                .setColor(0xe74c3c),
            ],
            components: [],
          });
        }

        runState.log.push(
          t('commands/dungeon:victory', {
            emoji: currentMonster.emoji,
            defaultValue: `✅ ${currentMonster.emoji} defeated`,
          }),
        );
        const roomGold = 15 + currentFloor * 2 + (isElite ? 25 : 0);
        const roomExp = 5 + currentFloor;
        runState.gold += roomGold;
        runState.exp += roomExp;
        player.balance += roomGold;
        player.exp += roomExp;
      } else if (event.type === 'treasure') {
        const gold = event.effect?.gold ?? 50 + currentFloor * 3;
        runState.gold += gold;
        player.balance += gold;
        runState.log.push(
          t('commands/dungeon:chest', { gold, defaultValue: `💰 Chest +${gold}g` }),
        );

        if (event.effect?.item) {
          const itemId = event.effect.item;
          const def = EVENT_ITEM_DEFS[itemId] ?? {};
          const itemData = {
            itemId,
            name: def.name ?? itemId,
            emoji: def.emoji ?? '📦',
            description: def.description ?? `Material dari ${zone}`,
            type: def.type ?? 'material',
            rarity: def.rarity ?? 'Common',
            sellPrice: def.sellPrice ?? 20 + currentFloor,
          };
          await itemModel.updateOne({ itemId }, { $setOnInsert: itemData }, { upsert: true });
          const inv = player.items.find((x) => x.itemId === itemId);
          if (inv) inv.qty++;
          else player.items.push({ itemId, qty: 1 });
          runState.log.push(
            t('commands/dungeon:got_item', {
              emoji: itemData.emoji,
              name: itemData.name,
              defaultValue: `📦 Got ${itemData.emoji} ${itemData.name}`,
            }),
          );
        }
      } else if (event.type === 'trap') {
        const damage = Math.abs(event.effect?.hp ?? 15 + currentFloor);
        player.hp = Math.max(1, player.hp - damage);
        runState.taken += damage;
        if (event.effect?.stamina) {
          player.stamina = Math.max(0, player.stamina + event.effect.stamina);
          runState.log.push(
            t('commands/dungeon:trap_both', {
              damage,
              stamina: event.effect.stamina,
              defaultValue: `🪤 Trap -${damage} HP ${event.effect.stamina} stamina`,
            }),
          );
        } else {
          runState.log.push(
            t('commands/dungeon:trap', { damage, defaultValue: `🪤 Trap -${damage} HP` }),
          );
        }
      } else if (event.type === 'heal') {
        const heal = event.effect?.hp ?? 30;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        if (event.effect?.stamina) {
          player.stamina = Math.min(player.maxStamina, player.stamina + event.effect.stamina);
          runState.log.push(
            t('commands/dungeon:heal_both', {
              heal,
              stamina: event.effect.stamina,
              defaultValue: `💚 Heal +${heal} HP +${event.effect.stamina} stamina`,
            }),
          );
        } else {
          runState.log.push(
            t('commands/dungeon:heal', { heal, defaultValue: `💚 Heal +${heal} HP` }),
          );
        }
      } else if (event.type === 'puzzle') {
        if (event.effect?.hp) {
          player.hp = Math.min(player.maxHp, player.hp + event.effect.hp);
          runState.log.push(
            t('commands/dungeon:puzzle_hp', {
              hp: event.effect.hp,
              defaultValue: `🧩 Puzzle +${event.effect.hp} HP`,
            }),
          );
        } else {
          const gold = event.effect?.gold ?? 100 + currentFloor * 2;
          runState.gold += gold;
          player.balance += gold;
          runState.log.push(
            t('commands/dungeon:puzzle_gold', { gold, defaultValue: `🧩 Puzzle +${gold}g` }),
          );
        }
      } else if (event.type === 'lore') {
        player.stamina = Math.min(player.maxStamina, player.stamina + DUNGEON_COST);
        const loreExp = 3 + Math.floor(currentFloor / 5);
        player.exp += loreExp;
        runState.exp += loreExp;
        runState.log.push(
          t('commands/dungeon:lore', {
            text: event.text,
            exp: loreExp,
            defaultValue: `📜 ${event.text} (+${loreExp} exp)`,
          }),
        );
      } else if (event.type === 'merchant') {
        const baseCost = Math.abs(event.effect?.gold ?? 100);
        const cost = baseCost + Math.floor(currentFloor * 2.5);
        const heal = 30 + Math.floor(currentFloor * 1.5);
        const canAfford = player.balance >= cost;

        const merchantEmbed = buildMerchantEmbed({
          text: event.text,
          cost,
          heal,
          floor: currentFloor,
          playerGold: player.balance,
          zone,
          t,
        });

        await button.editReply({
          embeds: [merchantEmbed],
          components: [getMerchantButtons(cost, canAfford, t)],
        });

        const choice = await message
          .awaitMessageComponent({
            filter: (i) => i.user.id === player.discordId && ['buy', 'skip'].includes(i.customId),
            time: 20_000,
            componentType: ComponentType.Button,
          })
          .catch(() => null);

        if (choice) await choice.deferUpdate();
        if (choice?.customId === 'buy' && player.balance >= cost) {
          player.balance -= cost;
          player.hp = Math.min(player.maxHp, player.hp + heal);
          runState.log.push(
            t('commands/dungeon:bought', {
              heal,
              cost,
              defaultValue: `🛒 Bought potion -${cost}g +${heal} HP`,
            }),
          );
          await choice.editReply({
            embeds: [
              merchantEmbed.setFooter({
                text: t('commands/dungeon:bought_footer', {
                  heal,
                  defaultValue: `✅ Purchased! +${heal} HP`,
                }),
              }),
            ],
            components: [],
          });
          await sleep(800);
        } else {
          runState.log.push(
            t('commands/dungeon:skipped', { defaultValue: `🛒 ${event.text} (skipped)` }),
          );
        }
      }

      await player.save();
      await dungeonData.save();

      if (runState.current >= runState.rooms) {
        const floorGold = 50 + currentFloor * 5 + (isBossFloor ? 300 : 0);
        const floorExp = 20 + currentFloor * 2;
        runState.gold += floorGold;
        runState.exp += floorExp;
        player.balance += floorGold;
        player.exp += floorExp;

        dungeonData.currentFloor++;
        if (currentFloor > dungeonData.highestFloor) dungeonData.highestFloor = currentFloor;

        const pool = isBossFloor
          ? (BOSS_DROPS[floorMonster.base] ?? BOSS_DROPS.guardian)
          : (DUNGEON_DROPS[floorMonster.base] ?? DUNGEON_DROPS.slime);

        if (Math.random() < (isBossFloor ? 1 : 0.4)) {
          const weights = { Common: 60, Uncommon: 25, Rare: 10, Epic: 4, Legendary: 1 };
          const weighted = pool.flatMap((d) => Array(weights[d.rarity] || 1).fill(d));
          const drop = weighted[Math.floor(Math.random() * weighted.length)];
          const safeDrop = {
            itemId: drop.id,
            name: drop.name,
            emoji: drop.emoji,
            description: drop.description,
            type: drop.type,
            rarity: drop.rarity,
            sellPrice: drop.sellPrice,
          };
          await itemModel.updateOne(
            { itemId: safeDrop.itemId },
            { $set: safeDrop },
            { upsert: true },
          );
          const inv = player.items.find((x) => x.itemId === safeDrop.itemId);
          if (inv) inv.qty++;
          else player.items.push({ itemId: safeDrop.itemId, qty: 1 });
          runState.log.push(
            t('commands/dungeon:drop', {
              emoji: safeDrop.emoji,
              name: safeDrop.name,
              defaultValue: `🎁 ${safeDrop.emoji} ${safeDrop.name}`,
            }),
          );
        }

        const levelUp = checkLevelUp(player);
        if (levelUp) {
          Object.assign(player, levelUp);
          runState.log.push(`
            \n${t('commands/dungeon:levelup', {
              level: levelUp.level,
              defaultValue: `🎉 LEVEL UP ${levelUp.level}!`,
            })}
          `);
        }

        dungeonData.inRun = false;
        dungeonData.floorState = null;
        dungeonData.lastRun = new Date();
        await player.save();
        await dungeonData.save();

        const clearEmbed = buildEmbed()
          .setTitle(
            t('commands/dungeon:clear_title', {
              floor: currentFloor,
              defaultValue: `✅ Floor ${currentFloor} Clear!`,
            }),
          )
          .setColor(0x2ecc71)
          .setDescription(
            runState.log.join('\n') +
              `
\n\n**${t('commands/dungeon:reward', { gold: runState.gold, exp: runState.exp, defaultValue: `Reward: +${runState.gold} gold • +${runState.exp} exp` })}**
\n\n**${t('commands/dungeon:continue_q', { defaultValue: 'Continue?' })}**`,
          );

        return button.editReply({
          embeds: [clearEmbed],
          components: [getContinueButtons(dungeonData.currentFloor, t)],
        });
      }

      await button.editReply({ embeds: [buildEmbed()], components: [getMainButtons(t)] });
    });

    collector.on('end', async () => {
      await player.save();
      await dungeonData.save();
    });
  }
}
