export interface ClassData {
  key: 'warrior' | 'mage' | 'rogue';
  name: string;
  emoji: string;
  hp: number;
  atk: number;
  stamina: number;
  color: number;
  desc: string;
  passive: string;
}

export const CLASSES: Record<ClassData['key'], ClassData> = {
  warrior: {
    key: 'warrior',
    name: 'Warrior',
    emoji: '⚔️',
    hp: 120,
    atk: 15,
    stamina: 120,
    color: 0xe74c3c,
    desc: 'Tahan banting, cocok buat main aman.',
    passive: '20% chance block 30% damage',
  },
  mage: {
    key: 'mage',
    name: 'Mage',
    emoji: '🪄',
    hp: 80,
    atk: 25,
    stamina: 80,
    color: 0x3498db,
    desc: 'Damage meledak, tapi stamina tipis.',
    passive: '15% chance lifesteal 25%',
  },
  rogue: {
    key: 'rogue',
    name: 'Rogue',
    emoji: '🏹',
    hp: 100,
    atk: 18,
    stamina: 100,
    color: 0x2ecc71,
    desc: 'Lincah, crit sering keluar.',
    passive: 'Crit rate 18% (base 10%)',
  },
};

export function getClass(key: string | null) {
  return CLASSES[key as keyof typeof CLASSES];
}
