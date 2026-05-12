import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ComponentType, EmbedBuilder, MessageFlags } from 'discord.js';
import { bar } from '../../lib/utils';
import { applyPassiveRegen } from '../../lib/rpg/buffs';
import { checkLevelUp } from '../../lib/rpg/leveling';
import { ACTION_COST } from '../../lib/rpg/actions';
import {
  getMonster,
  getFloorLore,
  DUNGEON_DROPS,
  DUNGEON_MONSTERS,
  BOSSES,
} from '../../lib/rpg/dungeon/dungeon-data';
import { rollEvent, getZone, type DungeonEvent } from '../../lib/rpg/dungeon/dungeon-events';
import { createRunState, getCheckpoint, RunState } from '../../lib/rpg/dungeon/dungeon-state';
import {
  buildMainEmbed,
  buildMapEmbed,
  buildFleeEmbed,
  buildRestEmbed,
  getMainButtons,
  getContinueButtons,
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
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((option) =>
          option
            .setName('action')
            .setDescription('Pilih')
            .setRequired(true)
            .addChoices(
              { name: 'Enter', value: 'enter' },
              { name: 'Status', value: 'status' },
              { name: 'Leave', value: 'leave' },
            ),
        ),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const { user: userModel, item: itemModel, dungeon: dungeonModel } = this.container.db;
    const action = interaction.options.getString('action', true) as 'enter' | 'status' | 'leave';

    const DUNGEON_COST = ACTION_COST.dungeon;

    // Ambil data player
    const player = await userModel.findOne({ discordId: interaction.user.id });
    if (!player)
      return interaction.reply({ content: 'Gunakan /start', flags: MessageFlags.Ephemeral });

    applyPassiveRegen(player);

    const dungeonData =
      (await dungeonModel.findOne({ discordId: player.discordId })) ??
      (await dungeonModel.create({ discordId: player.discordId }));

    // --- STATUS ---
    if (action === 'status') {
      await player.save();
      const lore = getFloorLore(dungeonData.currentFloor);
      const zone = getZone(dungeonData.currentFloor);
      const checkpoint = getCheckpoint(dungeonData.currentFloor);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('🗼 Tower of Stars')
            .setDescription(
              `**Lantai ${dungeonData.currentFloor}** • ${zone}\n*${lore}*\n\n` +
                `Highest: ${dungeonData.highestFloor}/100\nCheckpoint: ${checkpoint}\n` +
                `HP ${bar(player.hp, player.maxHp)} ${player.hp}/${player.maxHp}\n` +
                `Stamina ${bar(player.stamina, player.maxStamina)} ${player.stamina}/${player.maxStamina}\n` +
                `${dungeonData.inRun ? '⚠️ Sedang dalam run!' : ''}`,
            )
            .setColor(0x9b59b6),
        ],
      });
    }

    // --- LEAVE ---
    if (action === 'leave') {
      dungeonData.inRun = false;
      dungeonData.floorState = null;
      await dungeonData.save();
      return interaction.reply('Keluar tower. Run dibatalkan.');
    }

    // --- ENTER DUNGEON ---
    let currentFloor = dungeonData.currentFloor;

    if (player.stamina < DUNGEON_COST)
      return interaction.reply({
        content: `⚡ Stamina <${DUNGEON_COST}`,
        flags: MessageFlags.Ephemeral,
      });
    if (player.hp <= 0)
      return interaction.reply({ content: '❤️ HP 0', flags: MessageFlags.Ephemeral });

    // Buat run baru jika belum ada
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

    // Helper untuk build embed utama
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
      });

    const response = await interaction.reply({
      embeds: [buildEmbed()],
      components: [getMainButtons()],
      withResponse: true,
    });
    const message = response.resource!.message!;

    // Collector hanya untuk tombol navigasi (bukan battle)
    const collector = message.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300_000,
      filter: (btn) =>
        btn.user.id === interaction.user.id &&
        ['next', 'map', 'flee', 'continue', 'stop'].includes(btn.customId),
    });

    collector.on('collect', async (button) => {
      await button.deferUpdate();

      // --- FLEE ---
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
        });
        return button.editReply({ embeds: [fleeEmbed], components: [] });
      }

      // --- MAP ---
      if (button.customId === 'map') {
        const mapEmbed = buildMapEmbed({
          floor: currentFloor,
          state: runState,
          zone,
          lore,
          isBoss: isBossFloor,
          playerHp: player.hp,
          playerMaxHp: player.maxHp,
        });
        return button.editReply({ embeds: [mapEmbed], components: [getMainButtons()] });
      }

      // --- CONTINUE ---
      if (button.customId === 'continue') {
        if (player.stamina < DUNGEON_COST)
          return button.editReply({
            content: `⚡ Stamina <${DUNGEON_COST}!`,
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
        return button.editReply({ embeds: [buildEmbed()], components: [getMainButtons()] });
      }

      // --- STOP (Istirahat) ---
      if (button.customId === 'stop') {
        collector.stop();

        const restEmbed = buildRestEmbed({
          floor: currentFloor,
          state: runState,
          nextFloor: dungeonData.currentFloor,
          highestFloor: dungeonData.highestFloor,
        });

        return button.editReply({ embeds: [restEmbed], components: [] });
      }

      // --- NEXT ROOM ---
      if (player.stamina < DUNGEON_COST) {
        runState.log.push('⚡ Stamina habis!');
        dungeonData.inRun = false;
        dungeonData.floorState = null;
        await dungeonData.save();
        collector.stop();
        return button.editReply({
          content: 'Stamina habis!',
          embeds: [buildEmbed()],
          components: [],
        });
      }

      player.stamina -= DUNGEON_COST;
      runState.current++;
      const isLastRoom = runState.current === runState.rooms;

      // Tentukan event
      let event: DungeonEvent;
      if (isLastRoom && isBossFloor) {
        event = { id: 'boss', type: 'battle', weight: 0, text: `👑 ${floorMonster.name} BOSS!` };
      } else {
        const needForcedBattle = !runState.hasBattle && runState.current >= runState.rooms - 1;
        event = needForcedBattle
          ? { id: 'forced', type: 'battle', weight: 0, text: 'Musuh menghadang!' }
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

      // --- HANDLE BATTLE ---
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
        });

        // Jika kalah
        if (!battleResult.victory) {
          runState.log.push(`💀 Dikalahkan ${currentMonster.name}!`);
          dungeonData.inRun = false;
          dungeonData.floorState = null;
          const checkpoint = getCheckpoint(currentFloor);
          dungeonData.currentFloor = checkpoint;
          await dungeonData.save();
          await player.save();
          collector.stop();

          return button.editReply({
            embeds: [buildEmbed().setTitle(`💀 Kalah Lantai ${currentFloor}`).setColor(0xe74c3c)],
            components: [],
          });
        }

        // Reward battle (FIX BUG: ini yang hilang kemarin)
        runState.log.push(`✅ ${currentMonster.emoji} kalah`);
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
        runState.log.push(`💰 Chest +${gold}g`);
      } else if (event.type === 'trap') {
        const damage = Math.abs(event.effect?.hp ?? 15 + currentFloor);
        player.hp = Math.max(1, player.hp - damage);
        runState.taken += damage;
        runState.log.push(`🪤 Trap -${damage} HP`);
      } else if (event.type === 'heal') {
        const heal = event.effect?.hp ?? 30;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        runState.log.push(`💚 Heal +${heal} HP`);
      } else if (event.type === 'puzzle') {
        const gold = 100 + currentFloor * 2;
        runState.gold += gold;
        player.balance += gold;
        runState.log.push(`🧩 Puzzle +${gold}g`);
      }

      await player.save();
      await dungeonData.save();

      // --- FLOOR CLEAR ---
      if (runState.current >= runState.rooms) {
        const floorGold = 50 + currentFloor * 5 + (isBossFloor ? 300 : 0);
        const floorExp = 20 + currentFloor * 2;
        runState.gold += floorGold;
        runState.exp += floorExp;
        player.balance += floorGold;
        player.exp += floorExp;

        dungeonData.currentFloor++;
        if (currentFloor > dungeonData.highestFloor) dungeonData.highestFloor = currentFloor;

        // Drop item
        const pool = DUNGEON_DROPS[floorMonster.base] ?? DUNGEON_DROPS.slime;
        if (Math.random() < (isBossFloor ? 1 : 0.7)) {
          const drop = pool[Math.floor(Math.random() * pool.length)];
          await itemModel.updateOne({ itemId: drop.id }, { $set: drop }, { upsert: true });
          const inv = player.items.find((x) => x.itemId === drop.id);
          if (inv) inv.qty++;
          else player.items.push({ itemId: drop.id, qty: 1 });
          runState.log.push(`🎁 ${drop.emoji} ${drop.name}`);
        }

        const levelUp = checkLevelUp(player);
        if (levelUp) {
          Object.assign(player, levelUp);
          runState.log.push(`🎉 LEVEL UP ${levelUp.level}!`);
        }

        dungeonData.inRun = false;
        dungeonData.floorState = null;
        dungeonData.lastRun = new Date();
        await player.save();
        await dungeonData.save();

        const clearEmbed = buildEmbed()
          .setTitle(`✅ Lantai ${currentFloor} Clear!`)
          .setColor(0x2ecc71)
          .setDescription(
            runState.log.join('\n') +
              `\n\n**Reward: +${runState.gold} gold • +${runState.exp} exp**\n\n**Mau lanjut?**`,
          );

        return button.editReply({
          embeds: [clearEmbed],
          components: [getContinueButtons(dungeonData.currentFloor)],
        });
      }

      await button.editReply({ embeds: [buildEmbed()], components: [getMainButtons()] });
    });

    collector.on('end', async () => {
      await player.save();
      await dungeonData.save();
    });
  }
}
