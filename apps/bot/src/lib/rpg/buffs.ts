import type { HydratedDocument } from 'mongoose';

// sesuaikan dengan interface User di @nova/db
interface Buff {
  type: 'atk' | 'stamina_regen' | string;
  value: number;
  expires: Date;
}

interface RPGUser {
  buffs?: Buff[];
  stamina: number;
  maxStamina: number;
  lastPassive?: Date | null;
  // tambahkan field lain kalau perlu, tapi ini cukup untuk regen
}

export function applyPassiveRegen(user: HydratedDocument<RPGUser> | RPGUser) {
  const now = new Date();

  // 1. bersihin expired
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > now);

  // 2. hitung regen
  const regen = user.buffs
    .filter((b) => b.type === 'stamina_regen')
    .reduce((s, b) => s + b.value, 0);

  if (regen > 0 && user.lastPassive) {
    const mins = Math.floor((now.getTime() - user.lastPassive.getTime()) / 60000);
    if (mins > 0) {
      user.stamina = Math.min(user.maxStamina ?? 100, (user.stamina ?? 0) + mins * regen);
    }
  }
  user.lastPassive = now;
}

export function getAtkBuff(user: HydratedDocument<RPGUser> | RPGUser): number {
  const now = new Date();
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > now);
  return user.buffs.filter((b) => b.type === 'atk').reduce((s, b) => s + b.value, 0);
}
