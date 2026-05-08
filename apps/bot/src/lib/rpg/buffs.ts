export function applyPassiveRegen(user: any) {
  // 1. bersihin expired
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > new Date());

  // 2. hitung regen
  const regen = user.buffs
    .filter((b) => b.type === 'stamina_regen')
    .reduce((s, b) => s + b.value, 0);

  if (regen > 0 && user.lastPassive) {
    const mins = Math.floor((Date.now() - user.lastPassive.getTime()) / 60000);
    if (mins > 0) {
      user.stamina = Math.min(user.maxStamina, user.stamina + mins * regen);
    }
  }
  user.lastPassive = new Date();
}

export function getAtkBuff(user: any): number {
  user.buffs = (user.buffs || []).filter((b) => new Date(b.expires) > new Date());
  return user.buffs.filter((b) => b.type === 'atk').reduce((s, b) => s + b.value, 0);
}
