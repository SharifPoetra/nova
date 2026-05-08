import { IUser } from '@nova/db';

export function checkLevelUp(user: IUser) {
  let { level, exp, maxHp, attack, maxStamina } = user;
  const hpGain = 20;
  const atkGain = 3;
  const staGain = 10;

  let leveled = false;
  let expNeeded = level * 100;

  // loop biar bisa naik lebih dari 1 level sekaligus
  while (exp >= expNeeded) {
    exp -= expNeeded;
    level += 1;
    maxHp += hpGain;
    attack += atkGain;
    maxStamina += staGain;
    expNeeded = level * 100;
    leveled = true;
  }

  if (!leveled) return null;

  return {
    level,
    expLeft: exp,
    maxHp,
    attack,
    maxStamina,
    hp: maxHp, // full heal saat level up
    stamina: maxStamina, // full stamina saat level up
  };
}
