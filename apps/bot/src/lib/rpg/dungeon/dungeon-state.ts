import { getMonster } from './dungeon-data';

export interface RunState {
  rooms: number;
  current: number;
  log: string[];
  gold: number;
  exp: number;
  dealt: number;
  taken: number;
  hasBattle: boolean;
}

export function createRunState(floor: number): RunState {
  const monster = getMonster(floor);
  const isBossFloor = monster.isBoss;

  return {
    rooms: isBossFloor ? 4 : 3 + Math.floor(Math.random() * 2),
    current: 0,
    log: [],
    gold: 0,
    exp: 0,
    dealt: 0,
    taken: 0,
    hasBattle: false,
  };
}

export function getCheckpoint(floor: number): number {
  return Math.floor((floor - 1) / 25) * 25 || 1;
}
