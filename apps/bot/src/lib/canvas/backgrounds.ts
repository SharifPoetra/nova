import { Rarity } from '../utils';

export interface BackgroundInfo {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  file: string;
  description?: string;
  animated?: boolean; // buat nanti kalau support.gif/webp
}

export const BACKGROUNDS: Record<string, Omit<BackgroundInfo, 'id'>> = {
  default: {
    name: 'Default',
    price: 0,
    rarity: 'Common',
    file: 'default.png',
  },
  'mesh-sakura': {
    name: 'Sakura Mesh',
    price: 5000,
    rarity: 'Uncommon',
    file: 'mesh-sakura.png',
    description: 'Soft pink mesh with falling petals',
  },
};

export function getBackgroundInfo(bgId: string): BackgroundInfo {
  const id = bgId.toLowerCase().trim();
  const data = BACKGROUNDS[id];
  if (!data) return { id: 'default', ...BACKGROUNDS.default };
  return { id, ...data };
}

export function getAllBackgrounds(): BackgroundInfo[] {
  return Object.entries(BACKGROUNDS).map(([id, data]) => ({ id, ...data }));
}

export function getBackgroundsByRarity(rarity: Rarity) {
  return getAllBackgrounds().filter((bg) => bg.rarity === rarity);
}
