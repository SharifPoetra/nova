import type { User, UserBackground, Item, Dungeon, Guild } from '@nova/db';
import type { Connection } from 'mongoose';

declare module '@sapphire/pieces' {
  interface Container {
    db: {
      user: typeof User;
      item: typeof Item;
      dungeon: typeof Dungeon;
      guild: typeof Guild;
      userBackground: typeof UserBackground;
      connection: Connection;
    };
    invCache: Map<
      string,
      {
        allItems?: Array<{ id: string; text: string; sub: string; value: number; rarity: string }>;
        type: 'main' | 'consumable' | 'equipment';
        page: number;
        totalValue?: number;
        userId: string;
        t: number;
        locale?: string;
      }
    >;
  }
}
