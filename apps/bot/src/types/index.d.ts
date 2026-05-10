import type { User, Item, Dungeon } from '@nova/db';
import type { Connection } from 'mongoose';

declare module '@sapphire/pieces' {
  interface Container {
    db: {
      user: typeof User;
      item: typeof Item;
      dungeon: typeof Dungeon;
      connection: Connection;
    };
  }
}
