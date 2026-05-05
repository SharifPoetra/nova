import { UserModel } from '@nova/db';

declare module '@sapphire/pieces' {
  interface Container {
    db: typeof UserModel;
  }
}
