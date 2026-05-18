import { IUser } from '@nova/db';

export const getExpNeeded = (level: number) => Math.floor(50 * level + 50 * Math.pow(level, 1.6));

export const getScaledExp = (
  baseExp: number,
  userLevel: number,
  type: 'hunt' | 'fish' | 'explore' | 'dungeon' = 'hunt',
  isElite = false,
) => {
  const scales = {
    hunt: 0.06, // +6% per level
    fish: 0.04, // +4% per level
    explore: 0.05, // +5% per level
    dungeon: 0.02, // +2% per level (karena udah ada floor scaling)
  };

  const levelScale = 1 + userLevel * scales[type];
  const variance = 0.9 + Math.random() * 0.2; // 90%-110%
  const eliteMult = isElite ? 2.5 : 1;

  return Math.floor(baseExp * levelScale * variance * eliteMult);
};

export function checkLevelUp(user: IUser) {
  let leveled = false;
  let expNeeded = getExpNeeded(user.level);

  while (user.exp >= expNeeded) {
    user.exp -= expNeeded;
    user.level += 1;
    user.maxHp += 20;
    user.attack += 3;
    user.maxStamina += 10;
    expNeeded = getExpNeeded(user.level);
    leveled = true;
  }

  return leveled ? { level: user.level } : null;
}
