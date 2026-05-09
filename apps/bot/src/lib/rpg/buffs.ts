import type { HydratedDocument } from 'mongoose';

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
}

export function applyPassiveRegen(user: HydratedDocument<RPGUser> | RPGUser) {
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

  // 2. Perfect stack: hitung per-buff sampai waktu expired masing-masing
  for (const buff of regenBuffs) {
    const buffEnd = new Date(Math.min(new Date(buff.expires).getTime(), now.getTime()));
    const effectiveMs = buffEnd.getTime() - last.getTime();

    if (effectiveMs > 0) {
      const mins = Math.floor(effectiveMs / 60000);
      totalRegen += mins * buff.value;
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
  user.lastPassive = now;
}

export function getAtkBuff(user: HydratedDocument<RPGUser> | RPGUser): number {
  const now = new Date();
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > now);
  return user.buffs.filter((b) => b.type === 'atk').reduce((s, b) => s + b.value, 0);
}
