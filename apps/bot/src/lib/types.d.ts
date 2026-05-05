import { PrismaClient } from '@nova/db';

declare module '@sapphire/pieces' {
    interface Container {
        db: PrismaClient;
    }
}
