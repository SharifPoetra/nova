import { IUser } from '@nova/db';

export function checkLevelUp(user: IUser) {
  const expNeeded = user.level * 100;
  if (user.exp < expNeeded) return null;

  const newLevel = user.level + 1;
  const hpGain = 20;
  const atkGain = 3;
  const staGain = 10;

  return {
    level: newLevel,
    expLeft: user.exp - expNeeded,
    maxHp: user.maxHp + hpGain,
    attack: user.attack + atkGain,
    maxStamina: user.maxStamina + staGain,
    hp: user.maxHp + hpGain, // full heal
    stamina: user.maxStamina + staGain,
  };
}
