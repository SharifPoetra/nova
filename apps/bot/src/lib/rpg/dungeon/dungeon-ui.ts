import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { bar } from '../../utils';
import { RunState } from './dungeon-state';

export function renderMapIcons(state: RunState, isBoss: boolean): string {
  const icons: string[] = [];
  for (let i = 1; i <= state.rooms; i++) {
    if (i < state.current)
      icons.push('🟩'); // selesai
    else if (i === state.current)
      icons.push('🟦'); // posisi sekarang
    else if (i === state.rooms && isBoss)
      icons.push('👑'); // boss
    else icons.push('⬜'); // belum
  }
  return icons.join(' ');
}

export function buildMainEmbed(params: {
  floor: number;
  state: RunState;
  zone: string;
  lore: string;
  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
  highestFloor: number;
  isBoss: boolean;
}) {
  const {
    floor,
    state,
    zone,
    lore,
    playerHp,
    playerMaxHp,
    playerStamina,
    playerMaxStamina,
    highestFloor,
    isBoss,
  } = params;

  return new EmbedBuilder()
    .setTitle(`🗼 Lantai ${floor} [${state.current}/${state.rooms}] • ${zone}`)
    .setDescription(`*${lore}*\n\n${state.log.slice(-6).join('\n') || 'Memasuki tower...'}`)
    .addFields(
      {
        name: '❤️ HP',
        value: `${bar(playerHp, playerMaxHp)} ${playerHp}/${playerMaxHp}`,
        inline: false,
      },
      {
        name: '⚡ Stamina',
        value: `${bar(playerStamina, playerMaxStamina)} ${playerStamina}/${playerMaxStamina}`,
        inline: false,
      },
      { name: '💰 Gold Run', value: `${state.gold}`, inline: true },
      { name: '✨ EXP Run', value: `${state.exp}`, inline: true },
    )
    .setColor(isBoss ? 0xe74c3c : 0x9b59b6)
    .setFooter({ text: `Highest: ${highestFloor} • Dealt ${state.dealt} | Taken ${state.taken}` });
}

export function buildMapEmbed(params: {
  floor: number;
  state: RunState;
  zone: string;
  lore: string;
  isBoss: boolean;
  playerHp: number;
  playerMaxHp: number;
}) {
  return new EmbedBuilder()
    .setTitle(`🗺️ Peta Lantai ${params.floor}`)
    .setDescription(
      `*${params.lore}*\n${params.zone}\n\n**${renderMapIcons(params.state, params.isBoss)}**\n` +
        `\`${params.state.current}/${params.state.rooms} ruangan\`\n\n` +
        `🟩 Selesai • 🟦 Kamu • ⬜ Belum • ${params.isBoss ? '👑 Boss' : ''}\n\n` +
        `**Log Lengkap:**\n${params.state.log.join('\n') || '-'}`,
    )
    .setColor(0x3498db)
    .setFooter({
      text: `Gold: ${params.state.gold} • EXP: ${params.state.exp} • HP ${params.playerHp}/${params.playerMaxHp}`,
    });
}

export function buildFleeEmbed(params: {
  lore: string;
  floor: number;
  state: RunState;
  zone: string;
  checkpoint: number;
  playerHp: number;
  playerMaxHp: number;
  playerStamina: number;
  playerMaxStamina: number;
}) {
  return new EmbedBuilder()
    .setTitle('🏃 Kamu Mundur')
    .setColor(0x95a5a6)
    .setDescription(
      `*${params.lore}*\n\n` +
        `Kamu keluar dari **Room ${params.state.current}/${params.state.rooms}**.\n\n` +
        `> **Lantai ${params.floor} TIDAK hilang** — progress run saja yang dibatalkan.\n` +
        `> Kamu bisa masuk lagi dari awal Lantai ${params.floor} kapan saja.\n` +
        `> ℹ️ Checkpoint L${params.checkpoint} **hanya untuk respawn saat mati**, bukan saat kabur.`,
    )
    .addFields(
      { name: '💰 Gold dibawa pulang', value: `${params.state.gold}`, inline: true },
      { name: '✨ EXP didapat', value: `${params.state.exp}`, inline: true },
      {
        name: '❤️ HP / ⚡ Stamina',
        value: `${params.playerHp}/${params.playerMaxHp} • ${params.playerStamina}/${params.playerMaxStamina}`,
        inline: false,
      },
    )
    .setFooter({ text: `Tower of Stars • ${params.zone}` });
}

export function buildRestEmbed(params: {
  floor: number;
  state: RunState;
  nextFloor: number;
  highestFloor: number;
}) {
  return new EmbedBuilder()
    .setTitle(`✅ Lantai ${params.floor} Clear!`)
    .setColor(0x2ecc71)
    .setDescription(
      params.state.log.join('\n') +
        `\n\n**Reward: +${params.state.gold} koin • +${params.state.exp} exp**` +
        `\n\n🏠 Kamu istirahat di lantai ${params.nextFloor}.`,
    )
    .setFooter({ text: `Highest: ${params.highestFloor} • Tower of Stars` });
}

export function buildBattleEmbed(params: {
  monsterName: string;
  monsterEmoji: string;
  monsterHp: number;
  monsterMaxHp: number;
  playerName: string;
  playerHp: number;
  playerMaxHp: number;
  lore: string;
  action: string;
  isBoss: boolean;
  isElite: boolean;
  skillCd: number;
}) {
  return new EmbedBuilder()
    .setTitle(`${params.isElite ? '🌟 ' : ''}${params.isBoss ? '👑 ' : ''}⚔️ ${params.monsterName}`)
    .setDescription(`*${params.lore}*\n\n${params.action}`)
    .addFields(
      {
        name: `❤️ ${params.playerName}`,
        value: `${bar(params.playerHp, params.playerMaxHp)} ${params.playerHp}/${params.playerMaxHp}`,
        inline: true,
      },
      {
        name: `${params.monsterEmoji} HP`,
        value: `${bar(Math.max(0, params.monsterHp), params.monsterMaxHp)} ${Math.max(0, params.monsterHp)}/${params.monsterMaxHp}`,
        inline: true,
      },
    )
    .setColor(params.isElite ? 0xf1c40f : params.isBoss ? 0xe74c3c : 0xe67e22)
    .setFooter({
      text: params.skillCd ? `Skill cooldown: ${params.skillCd} turn` : 'Pilih aksimu!',
    });
}

export function buildMerchantEmbed(params: {
  text: string;
  cost: number;
  heal: number;
  floor: number;
  playerGold: number;
}) {
  return new EmbedBuilder()
    .setTitle('🛒 Pedagang Misterius')
    .setDescription(
      `*${params.text}*\n\n` +
        `Menawarkan **Ramuan Penyembuh**\n` +
        `💚 Heal: +${params.heal} HP\n` +
        `💰 Harga: ${params.cost} gold\n\n` +
        `Gold kamu: ${params.playerGold}`,
    )
    .setColor(0xf1c40f)
    .setFooter({ text: `Lantai ${params.floor} • Pilih dalam 20 detik` });
}

export function getMerchantButtons(cost: number, canAfford: boolean) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('buy')
      .setLabel(`Beli (${cost}g)`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canAfford),
    new ButtonBuilder().setCustomId('skip').setLabel('Lewati').setStyle(ButtonStyle.Secondary),
  );
}

export function getMainButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('next').setLabel('➡️ Masuk Room').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('map').setLabel('🗺️ Peta').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('flee').setLabel('🏃 Kabur').setStyle(ButtonStyle.Danger),
  );
}

export function getBattleButtons(skillName: string, skillCd: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId('atk').setLabel('🗡️ Attack').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('def').setLabel('🛡️ Defend').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('skl')
      .setLabel(`✨ ${skillName}${skillCd ? ` (${skillCd})` : ''}`)
      .setStyle(ButtonStyle.Success)
      .setDisabled(skillCd > 0),
  );
}

export function getContinueButtons(nextFloor: number) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('continue')
      .setLabel(`➡️ Lanjut L${nextFloor}`)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('stop')
      .setLabel('🏠 Istirahat')
      .setStyle(ButtonStyle.Secondary),
  );
}
