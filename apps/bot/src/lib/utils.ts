export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const bar = (cur: number, max: number, size = 10) => {
  const p = Math.max(0, Math.min(1, cur / max));
  const f = Math.round(p * size);
  return '▰'.repeat(f) + '▱'.repeat(size - f);
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
