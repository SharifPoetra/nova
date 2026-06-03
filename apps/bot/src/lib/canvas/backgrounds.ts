import { Rarity } from '../utils';

export interface BackgroundInfo {
  id: string;
  name: string;
  price: number;
  rarity: Rarity;
  file: string;
  description?: string;
  animated?: boolean;
}

export const BACKGROUNDS: Record<string, Omit<BackgroundInfo, 'id'>> = {
  default: {
    name: 'Default',
    price: 0,
    rarity: 'Common',
    file: 'default.png',
    description: 'Original Nova gradient #0f0c29 → #1b183a',
  },

  // COMMON - 1.5k-2.5k
  'gradient-midnight': {
    name: 'Midnight Gradient',
    price: 1500,
    rarity: 'Common',
    file: 'gradient-midnight.png',
    description: 'Deep navy fade, clean and minimal',
  },
  'radial-void': {
    name: 'Void Radial',
    price: 2000,
    rarity: 'Common',
    file: 'radial-void.png',
    description: 'Soft black center glow',
  },
  'gradient-forest': {
    name: 'Forest Haze',
    price: 2500,
    rarity: 'Common',
    file: 'gradient-forest.png',
    description: 'Dark green gradient for nature builds',
  },

  // UNCOMMON - 5k-8k
  'radial-ocean-dots': {
    name: 'Ocean Dots',
    price: 5000,
    rarity: 'Uncommon',
    file: 'radial-ocean-dots.png',
    description: 'Blue radial with subtle dot grid',
  },
  'waves-ice': {
    name: 'Ice Waves',
    price: 6500,
    rarity: 'Uncommon',
    file: 'waves-ice.png',
    description: 'Cyan sine waves, chill vibes',
  },
  'radial-royal-hex': {
    name: 'Royal Hex',
    price: 7500,
    rarity: 'Uncommon',
    file: 'radial-royal-hex.png',
    description: 'Purple radial over hex pattern',
  },
  'mesh-sakura': {
    name: 'Sakura Mesh',
    price: 8000,
    rarity: 'Uncommon',
    file: 'mesh-sakura.png',
    description: 'Soft pink mesh with falling petals',
  },

  // RARE - 15k-22k
  'aurora-nebula': {
    name: 'Nebula Aurora',
    price: 15000,
    rarity: 'Rare',
    file: 'aurora-nebula.png',
    description: 'Purple aurora ribbons in deep space',
  },
  'mesh-sunset-hex': {
    name: 'Sunset Mesh',
    price: 18000,
    rarity: 'Rare',
    file: 'mesh-sunset-hex.png',
    description: 'Orange blobs with hex overlay',
  },
  'aurora-crimson': {
    name: 'Crimson Aurora',
    price: 20000,
    rarity: 'Rare',
    file: 'aurora-crimson.png',
    description: 'Blood-red aurora, intense',
  },
  'waves-sakura-dots': {
    name: 'Sakura Waves',
    price: 22000,
    rarity: 'Rare',
    file: 'waves-sakura-dots.png',
    description: 'Pink waves with dot pattern - fan favorite',
  },

  // EPIC - 45k-65k
  'glow_orbs-nebula': {
    name: 'Nebula Orbs',
    price: 45000,
    rarity: 'Epic',
    file: 'glow_orbs-nebula.png',
    description: 'Four purple orbs floating in void',
  },
  'aurora-ice-grid': {
    name: 'Arctic Aurora',
    price: 55000,
    rarity: 'Epic',
    file: 'aurora-ice-grid.png',
    description: 'Cyan aurora with grid, clean tech',
  },
  'mesh-gold-dots': {
    name: 'Golden Mesh',
    price: 60000,
    rarity: 'Epic',
    file: 'mesh-gold-dots.png',
    description: 'Gold blobs with dots',
  },
  'glow_orbs-sakura': {
    name: 'Sakura Orbs',
    price: 65000,
    rarity: 'Epic',
    file: 'glow_orbs-sakura.png',
    description: 'Pink orbs, soft glow, premium',
  },

  // LEGENDARY - 150k-300k
  'aurora-gold-noise': {
    name: 'Aureate Aurora',
    price: 150000,
    rarity: 'Legendary',
    file: 'aurora-gold-noise.png',
    description: 'Gold aurora with noise - the flex',
  },
  'mesh-cyber-hex': {
    name: 'Cyber Mesh',
    price: 225000,
    rarity: 'Legendary',
    file: 'mesh-cyber-hex.png',
    description: 'Neon green mesh + hex - cyberpunk king',
  },
  'aurora-cyber': {
    name: 'Cyber Aurora',
    price: 300000,
    rarity: 'Legendary',
    file: 'aurora-cyber.png',
    description: 'Pure #00ff88 aurora',
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
