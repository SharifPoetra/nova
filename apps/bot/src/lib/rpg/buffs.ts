import type { HydratedDocument } from 'mongoose';
import type { IUser, IBuff } from '@nova/db';

export function applyPassiveRegen(user: IUser) {
  const now = new Date();
  const last = user.lastPassive ?? now;

  if (now <= last) {
    user.lastPassive = now;
    return;
  }

  // 1. Ambil semua buff regen yang pernah aktif sejak last
  const regenBuffs = (user.buffs || []).filter(
    (b) => b.type === 'stamina_regen' && new Date(b.expires) > last,
  );

  let totalRegen = 0;
  let furthestProcessed = last;

  // 2. Perfect stack: hitung per-buff sampai waktu expired masing-masing
  for (const buff of regenBuffs) {
    const buffEnd = new Date(Math.min(new Date(buff.expires).getTime(), now.getTime()));
    const effectiveMs = buffEnd.getTime() - last.getTime();

    if (effectiveMs > 0) {
      const mins = Math.floor(effectiveMs / 60000);
      totalRegen += mins * buff.value;

      if (buffEnd > furthestProcessed) furthestProcessed = buffEnd;
    }
  }

  // 3. Tambah ke stamina, tapi JANGAN PERNAH lewat maxStamina
  if (totalRegen > 0) {
    const current = user.stamina ?? 0;
    const max = user.maxStamina ?? 100;
    user.stamina = Math.min(max, current + totalRegen);
  }

  // 4. Bersihkan buff expired
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > now);

  const totalMinsProcessed = Math.floor((furthestProcessed.getTime() - last.getTime()) / 60000);
  if (totalMinsProcessed > 0) {
    user.lastPassive = new Date(last.getTime() + totalMinsProcessed * 60000);
  }
}

export function getAtkBuff(user: IUser): number {
  const now = new Date();
  // Clean expired
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > now);
  // Sum buff yang punya turnsLeft > 0 atau expires > now
  return user.buffs
    .filter((b) => b.type === 'atk' && ((b.turnsLeft ?? 0) > 0 || new Date(b.expires) > now))
    .reduce((s, b) => s + b.value, 0);
}
