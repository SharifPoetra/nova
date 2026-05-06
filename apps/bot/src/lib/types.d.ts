import type { User, Item } from '@nova/db';

declare module '@sapphire/pieces' {
  interface Container {
    db: {
      user: typeof User;
      item: typeof Item;
    };
  }
}
