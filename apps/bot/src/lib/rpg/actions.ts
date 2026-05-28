export const ACTION_COST = {
  hunt: 5,
  explore: 12,
  fish: 8,
  cook: 5,
  craft: 8,
  mine: 10,
  dungeon: 3,
} as const;

export type ActionKey = keyof typeof ACTION_COST;
