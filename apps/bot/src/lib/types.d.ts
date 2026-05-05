import type { User } from '@nova/db';

declare module '@sapphire/pieces' {
  interface Container {
    db: {
      user: typeof User;
    };
  }
}
