import type { User, Item } from '@nova/db';
import type { Connection } from 'mongoose';

declare module '@sapphire/pieces' {
  interface Container {
    db: {
      user: typeof User;
      item: typeof Item;
      connection: Connection;
    };
  }
}
