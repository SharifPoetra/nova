import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder, MessageFlags } from 'discord.js';

type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';

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
     .addSubcommand((s) => s.setName('enter').setDescription('Masuk lantai berikutnya'))
     .addSubcommand((s) => s.setName('status').setDescription('Lihat progress'))
     .addSubcommand((s) => s.setName('leave').setDescription('Keluar dungeon')),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const { user, item, dungeon } = this.container.db;
    const sub = interaction.options.getSubcommand();

    const userData = await user.findOne({ discordId: interaction.user.id });
    if (!userData) {
      return interaction.reply({
        content: 'Gunakan /start dulu',
        flags: MessageFlags.Ephemeral,
      });
    }

    let dungeonData = await dungeon.findOne({ discordId: userData.discordId });
    if (!dungeonData) dungeonData = await dungeon.create({ discordId: userData.discordId });

    if (sub === 'status') {
      const embed = new EmbedBuilder()
     .setTitle('🗼 Tower of Stars')
     .setDescription(
          `Highest: **${dungeonData.highestFloor}/100**\n` +
            `Current: **${dungeonData.currentFloor}**\n` +
            `HP: ${userData.hp}/${userData.maxHp}\n` +
            `Stamina: ${userData.stamina}/${userData.maxStamina}`,
        )
     .setColor(0x9b59b6);
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'enter') {
      if (userData.stamina < 10) {
        return interaction.reply({
          content: 'Stamina kurang (butuh 10)',
          flags: MessageFlags.Ephemeral,
        });
      }
      if (userData.hp <= 0) {
        return interaction.reply({
          content: 'HP 0, pakai hp potion dulu',
          flags: MessageFlags.Ephemeral,
        });
      }

      const floor = dungeonData.currentFloor;
      const isBoss = floor % 10 === 0;

      const baseHp = 50 + floor * 8;
      const baseAtk = 8 + floor * 1.5;
      const monsterMaxHp = Math.floor(isBoss? baseHp * 3 : baseHp);
      const monsterAtk = Math.floor(isBoss? baseAtk * 2 : baseAtk);

      userData.stamina -= 10;

      // === COMBAT BARU ===
      let monsterHp = monsterMaxHp;
      let playerHp = userData.hp;
      let totalPlayerDmg = 0;
      let totalMonsterDmg = 0;
      let turns = 0;

      while (playerHp > 0 && monsterHp > 0 && turns < 20) {
        turns++;
        // player hit
        const pDmg = Math.max(1, userData.attack + Math.floor(Math.random() * 6) - 1);
        monsterHp -= pDmg;
        totalPlayerDmg += pDmg;
        if (monsterHp <= 0) break;

        // monster hit
        const mDmg = Math.max(1, monsterAtk + Math.floor(Math.random() * 4) - 1);
        playerHp -= mDmg;
        totalMonsterDmg += mDmg;
      }

      userData.hp = Math.max(0, playerHp);
      const won = monsterHp <= 0;
      // === END COMBAT ===

      let result = '';

      if (won) {
        const gold = 50 + floor * 5 + (isBoss? 200 : 0);
        const exp = 20 + floor * 2;
        userData.balance += gold;
        userData.exp += exp;

        while (userData.exp >= userData.level * 100) {
          userData.exp -= userData.level * 100;
          userData.level += 1;
          userData.maxHp += 10;
          userData.attack += 2;
          userData.hp = userData.maxHp;
        }

        dungeonData.currentFloor += 1;
        if (dungeonData.currentFloor - 1 > dungeonData.highestFloor) {
          dungeonData.highestFloor = dungeonData.currentFloor - 1;
        }

        if (floor % 25 === 0) {
          result += `✅ Checkpoint lantai ${floor} disimpan!\n`;
        }

        const rarities: Rarity[] = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        const weights = isBoss? [20, 30, 30, 15, 5] : [60, 25, 10, 4, 1];
        const roll = Math.random() * 100;
        let cum = 0;
        let rarity: Rarity = 'Common';
        for (let i = 0; i < weights.length; i++) {
          cum += weights[i];
          if (roll < cum) {
            rarity = rarities[i];
            break;
          }
        }

        const drops = await item.find({ rarity: rarity });
        if (drops.length) {
          const drop = drops[Math.floor(Math.random() * drops.length)];
          const invItem = userData.items.find((i) => i.itemId === drop.itemId);
          if (invItem) invItem.qty += 1;
          else userData.items.push({ itemId: drop.itemId, qty: 1 });
          result += `Drop: ${drop.emoji} ${drop.name} (${rarity})\n`;
        }

        result = `**LANTAI ${floor} ${isBoss? '👑 BOSS' : ''} - MENANG**\n` +
          `Monster HP: ${monsterMaxHp} | Kamu hit total ${totalPlayerDmg} (${turns} turn)\n` +
          `Kena damage ${totalMonsterDmg}\n` +
          `${result}+${gold}g | +${exp}xp`;
      } else {
        const checkpoint = Math.floor((floor - 1) / 25) * 25;
        dungeonData.currentFloor = checkpoint === 0? 1 : checkpoint;
        result = `**LANTAI ${floor} - KALAH**\n` +
          `Monster sisa HP: ${Math.max(0, monsterHp)}/${monsterMaxHp}\n` +
          `Kamu kena total ${totalMonsterDmg} damage (${turns} turn)\n` +
          `Respawn di lantai ${dungeonData.currentFloor}`;
      }

      dungeonData.lastRun = new Date();
      await userData.save();
      await dungeonData.save();

      const embed = new EmbedBuilder()
     .setTitle(`🗼 Lantai ${floor}`)
     .setDescription(result)
     .setColor(won? 0x2ecc71 : 0xe74c3c)
     .setFooter({ text: `HP: ${userData.hp}/${userData.maxHp} | Stamina: ${userData.stamina}` });

      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'leave') {
      dungeonData.inRun = false;
      await dungeonData.save();
      return interaction.reply('Kamu keluar dari tower. Progress disimpan.');
    }
  }
}