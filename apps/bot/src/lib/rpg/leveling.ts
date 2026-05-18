import { IUser } from '@nova/db';

export const getExpNeeded = (level: number) => level * 100;

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
