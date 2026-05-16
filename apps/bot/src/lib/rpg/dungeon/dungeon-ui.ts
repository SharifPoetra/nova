import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { colorBar, ratioBar } from '../../utils';
import { RunState } from './dungeon-state';
import type { TFunction } from 'i18next';

export function renderMapIcons(state: RunState, isBoss: boolean): string {
  const icons: string[] = [];
  for (let i = 1; i <= state.rooms; i++) {
    if (i < state.current) icons.push('🟩');
    else if (i === state.current) icons.push('🟦');
    else if (i === state.rooms && isBoss) icons.push('👑');
    else icons.push('⬜');
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
  t: TFunction;
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
    t,
  } = params;
  return new EmbedBuilder()
    .setTitle(
      t('commands/dungeon:main_title', {
        floor,
        current: state.current,
        rooms: state.rooms,
        zone,
        defaultValue: `🗼 Floor ${floor} [${state.current}/${state.rooms}] • ${zone}`,
      }),
    )
    .setDescription(
      `*${lore}*\n\n${state.log.slice(-6).join('\n') || t('commands/dungeon:entering', { defaultValue: 'Entering tower...' })}`,
    )
    .addFields(
      {
        name: t('commands/dungeon:hp', { defaultValue: '❤️ HP' }),
        value: `${colorBar(playerHp, playerMaxHp, 10, '🟥', '⬛')} ${playerHp}/${playerMaxHp}`,
        inline: false,
      },
      {
        name: t('commands/dungeon:stamina', { defaultValue: '⚡ Stamina' }),
        value: `${colorBar(playerStamina, playerMaxStamina, 10, '🟨', '⬛')} ${playerStamina}/${playerMaxStamina}`,
        inline: false,
      },
      {
        name: t('commands/dungeon:gold_run', { defaultValue: '💰 Gold Run' }),
        value: `${state.gold}`,
        inline: true,
      },
      {
        name: t('commands/dungeon:exp_run', { defaultValue: '✨ EXP Run' }),
        value: `${state.exp}`,
        inline: true,
      },
    )
    .setColor(isBoss ? 0xe74c3c : 0x9b59b6)
    .setFooter({
      text: t('commands/dungeon:main_footer', {
        highest: highestFloor,
        dealt: state.dealt,
        taken: state.taken,
        defaultValue: `Highest: ${highestFloor} • Dealt ${state.dealt} | Taken ${state.taken}`,
      }),
    });
}

export function buildMapEmbed(params: {
  floor: number;
  state: RunState;
  zone: string;
  lore: string;
  isBoss: boolean;
  playerHp: number;
  playerMaxHp: number;
  t: TFunction;
}) {
  const { t } = params;
  return new EmbedBuilder()
    .setTitle(
      t('commands/dungeon:map_title', {
        floor: params.floor,
        defaultValue: `🗺️ Floor ${params.floor} Map`,
      }),
    )
    .setDescription(
      `*${params.lore}*\n${params.zone}\n\n**${renderMapIcons(params.state, params.isBoss)}**\n\`${params.state.current}/${params.state.rooms} ${t('commands/dungeon:rooms', { defaultValue: 'rooms' })}\`\n\n🟩 ${t('commands/dungeon:done')} • 🟦 ${t('commands/dungeon:you')} • ⬜ ${t('commands/dungeon:not_yet')} • ${params.isBoss ? '👑 Boss' : ''}\n\n**${t('commands/dungeon:full_log')}:**\n${params.state.log.join('\n') || '-'}`,
    )
    .setColor(0x3498db)
    .setFooter({
      text: t('commands/dungeon:map_footer', {
        gold: params.state.gold,
        exp: params.state.exp,
        hp: params.playerHp,
        maxHp: params.playerMaxHp,
      }),
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
  t: TFunction;
}) {
  const { t } = params;
  return new EmbedBuilder()
    .setTitle(t('commands/dungeon:flee_title', { defaultValue: '🏃 You Fled' }))
    .setColor(0x95a5a6)
    .setDescription(
      `*${params.lore}*\n\n${t('commands/dungeon:flee_desc', { current: params.state.current, rooms: params.state.rooms, floor: params.floor, checkpoint: params.checkpoint })}`,
    )
    .addFields(
      {
        name: t('commands/dungeon:gold_brought', { defaultValue: '💰 Gold brought' }),
        value: `${params.state.gold}`,
        inline: true,
      },
      {
        name: t('commands/dungeon:exp_gained', { defaultValue: '✨ EXP gained' }),
        value: `${params.state.exp}`,
        inline: true,
      },
      {
        name: `${t('commands/dungeon:hp')} / ${t('commands/dungeon:stamina')}`,
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
  t: TFunction;
}) {
  const { t } = params;
  return new EmbedBuilder()
    .setTitle(
      t('commands/dungeon:clear_title', {
        floor: params.floor,
        defaultValue: `✅ Floor ${params.floor} Clear!`,
      }),
    )
    .setColor(0x2ecc71)
    .setDescription(
      params.state.log.join('\n') +
        `\n\n**${t('commands/dungeon:reward', { gold: params.state.gold, exp: params.state.exp })}**\n\n${t('commands/dungeon:resting', { floor: params.nextFloor })}`,
    )
    .setFooter({ text: t('commands/dungeon:rest_footer', { highest: params.highestFloor }) });
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
  t: TFunction;
}) {
  const { t } = params;
  return new EmbedBuilder()
    .setTitle(`${params.isElite ? '🌟 ' : ''}${params.isBoss ? '👑 ' : ''}⚔️ ${params.monsterName}`)
    .setDescription(`*${params.lore}*\n\n${params.action}`)
    .addFields(
      {
        name: `❤️ ${params.playerName}`,
        value: `${ratioBar(params.playerHp, params.playerMaxHp)} ${params.playerHp}/${params.playerMaxHp}`,
        inline: true,
      },
      {
        name: `${params.monsterEmoji} HP`,
        value: `${ratioBar(Math.max(0, params.monsterHp), params.monsterMaxHp)} ${Math.max(0, params.monsterHp)}/${params.monsterMaxHp}`,
        inline: true,
      },
    )
    .setColor(params.isElite ? 0xf1c40f : params.isBoss ? 0xe74c3c : 0xe67e22)
    .setFooter({
      text: params.skillCd
        ? t('commands/dungeon:skill_cd', { cd: params.skillCd })
        : t('commands/dungeon:choose_action'),
    });
}

export function buildMerchantEmbed(params: {
  text: string;
  cost: number;
  heal: number;
  floor: number;
  playerGold: number;
  zone: string;
  t: TFunction;
}) {
  const { t } = params;
  const titles: Record<string, string> = {
    ruins: t('commands/dungeon:merchant_ruins', { defaultValue: '🛒 Ruins Trader' }),
    mines: t('commands/dungeon:merchant_mines', { defaultValue: '⛏️ Dwarf Trader' }),
    library: t('commands/dungeon:merchant_library', { defaultValue: '📚 Librarian' }),
    temple: t('commands/dungeon:merchant_temple', { defaultValue: '⛩️ Shrine Maiden' }),
    summit: t('commands/dungeon:merchant_summit', { defaultValue: '✨ Astral Trader' }),
  };
  return new EmbedBuilder()
    .setTitle(titles[params.zone] ?? t('commands/dungeon:merchant_default'))
    .setDescription(
      t('commands/dungeon:merchant_desc', {
        text: params.text,
        heal: params.heal,
        cost: params.cost,
        gold: params.playerGold,
      }),
    )
    .setColor(0xf1c40f)
    .setFooter({ text: t('commands/dungeon:merchant_footer', { floor: params.floor }) });
}

export function getMerchantButtons(cost: number, canAfford: boolean, t: TFunction) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('buy')
      .setLabel(t('commands/dungeon:btn_buy', { cost, defaultValue: `Buy (${cost}g)` }))
      .setStyle(ButtonStyle.Success)
      .setDisabled(!canAfford),
    new ButtonBuilder()
      .setCustomId('skip')
      .setLabel(t('commands/dungeon:btn_skip', { defaultValue: 'Skip' }))
      .setStyle(ButtonStyle.Secondary),
  );
}

export function getMainButtons(t: TFunction) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('next')
      .setLabel(t('commands/dungeon:btn_next', { defaultValue: '➡️ Next Room' }))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('map')
      .setLabel(t('commands/dungeon:btn_map', { defaultValue: '🗺️ Map' }))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('flee')
      .setLabel(t('commands/dungeon:btn_flee', { defaultValue: '🏃 Flee' }))
      .setStyle(ButtonStyle.Danger),
  );
}

export function getBattleButtons(skillName: string, skillCd: number, t: TFunction) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('atk')
      .setLabel(t('commands/dungeon:btn_attack', { defaultValue: '🗡️ Attack' }))
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('def')
      .setLabel(t('commands/dungeon:btn_defend', { defaultValue: '🛡️ Defend' }))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('skl')
      .setLabel(
        t('commands/dungeon:btn_skill', {
          skill: skillName,
          cd: skillCd ? ` (${skillCd})` : '',
          defaultValue: `✨ ${skillName}${skillCd ? ` (${skillCd})` : ''}`,
        }),
      )
      .setStyle(ButtonStyle.Success)
      .setDisabled(skillCd > 0),
  );
}

export function getContinueButtons(nextFloor: number, t: TFunction) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('continue')
      .setLabel(
        t('commands/dungeon:btn_continue', {
          floor: nextFloor,
          defaultValue: `➡️ Continue F${nextFloor}`,
        }),
      )
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('stop')
      .setLabel(t('commands/dungeon:btn_stop', { defaultValue: '🏠 Rest' }))
      .setStyle(ButtonStyle.Secondary),
  );
}
