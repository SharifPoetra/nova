export const ACTION_COST = {
  hunt: 20,
  explore: 15,
  fish: 10,
  cook: 5,
  mine: 15,
} as const;

export type ActionKey = keyof typeof ACTION_COST;
