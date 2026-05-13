export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const uniBar = (current: number, max: number, size = 10) => {
  const safeMax = Math.max(1, max ?? 1);
  const safeCurrent = Math.max(0, current ?? 0);

  const percent = Math.min(1, safeCurrent / safeMax);
  const filledCount = Math.round(percent * size);
  const emptyCount = size - filledCount;

  return '▰'.repeat(filledCount) + '▱'.repeat(emptyCount);
};

/**
 * pakai:
 * colorBar(hp, maxHp, 10, '🟥', '⬛')  // HP merah
 * colorBar(stamina, maxStamina, 10, '🟨', '⬛')  // stamina kuning
 * colorBar(exp, expNeeded, 12, '🟦', '⬜')  // exp biru
 **/
export const colorBar = (
  current: number,
  max: number,
  size = 10,
  filledEmoji = '🟩',
  emptyEmoji = '⬜',
) => {
  const safeMax = Math.max(1, max ?? 1);
  const safeCurrent = Math.max(0, current ?? 0);

  const percent = Math.min(1, safeCurrent / safeMax);
  const filledCount = Math.round(percent * size);
  const emptyCount = Math.max(0, size - filledCount);

  return filledEmoji.repeat(filledCount) + emptyEmoji.repeat(emptyCount);
};

export const ratioBar = (current: number, max: number, size = 10) => {
  const ratio = Math.min(1, Math.max(0, current / Math.max(1, max)));
  const filled = Math.round(ratio * size);
  const emoji = ratio > 0.6 ? '🟩' : ratio > 0.3 ? '🟨' : '🟥';
  return emoji.repeat(filled) + '⬛'.repeat(size - filled);
};

export const formatNumber = (n: number) => n.toLocaleString('id-ID');

export const RARITY_COLOR = {
  Common: 0x95a5a6,
  Uncommon: 0x2ecc71,
  Rare: 0x3498db,
  Epic: 0x9b59b6,
  Legendary: 0xf1c40f,
  Mythic: 0xe74c3c,
} as const;

export type Rarity = keyof typeof RARITY_COLOR;

export const RARITY_EMOJI: Record<Rarity, string> = {
  Common: '⚪',
  Uncommon: '🟢',
  Rare: '🔵',
  Epic: '🟣',
  Legendary: '🟡',
  Mythic: '🔴',
};

export const COLORS = {
  primary: 0x5865f2,
  success: 0x2ecc71,
  error: 0xe74c3c,
  warning: 0xf1c40f,
};
