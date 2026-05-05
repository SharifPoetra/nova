import { PrismaClient } from './prisma/generated-client/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from "ws";

// Paksa pakai WebSocket agar tidak nyari localhost
neonConfig.webSocketConstructor = ws;

export const createDatabase = (connectionString: string) => {
    // 1. Buat adapter
    const adapter = new PrismaNeon({ connectionString });

    // 2. Masukkan ke PrismaClient
    return new PrismaClient({ adapter });
};

export * from './prisma/generated-client/client';
