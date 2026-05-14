import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { setGlobalDispatcher, Agent } from 'undici';
import { GatewayIntentBits } from 'discord.js';
import {
  SapphireClient,
  container,
  ApplicationCommandRegistries,
  LogLevel,
} from '@sapphire/framework';
import { createDatabase, User, Item, Dungeon } from '@nova/db';

// undici keepalive
setGlobalDispatcher(
  new Agent({
    connect: { timeout: 15000 },
    keepAliveTimeout: 1000,
    keepAliveMaxTimeout: 1000,
    pipelining: 1,
  }),
);

const devGuildId = process.env.DEV_GUILD_ID;
if (process.env.NODE_ENV === 'development' && devGuildId) {
  ApplicationCommandRegistries.setDefaultGuildIds([devGuildId]);
}

const isProd = process.env.NODE_ENV === 'production';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  logger: {
    level: isProd ? LogLevel.Info : LogLevel.Debug, // <-- ini kuncinya
  },
  baseUserDirectory: __dirname,
  loadMessageCommandListeners: true,
});

// --- Hook file logging dengan rotasi harian ---
const LOG_DIR = path.join(process.cwd(), 'logs');
if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

const getLogFile = () => path.join(LOG_DIR, `nova-${new Date().toISOString().slice(0, 10)}.log`);

let currentDate = new Date().toISOString().slice(0, 10);
let fileStream: WriteStream = createWriteStream(getLogFile(), { flags: 'a' });

const rotateIfNeeded = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDate) {
    currentDate = today;
    fileStream.end();
    fileStream = createWriteStream(getLogFile(), { flags: 'a' });
  }
};

const originalWrite = client.logger.write.bind(client.logger);
client.logger.write = (level: LogLevel, ...values: readonly unknown[]) => {
  // 1. tulis ke file SELALU (termasuk DEBUG) - dengan rotasi
  rotateIfNeeded();
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Kuching' });
  const levelName = LogLevel[level].toUpperCase();
  const msg = values.map((v) => (typeof v === 'object' ? JSON.stringify(v) : String(v))).join(' ');
  const clean = msg.replace(/\u001b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
  fileStream.write(`[${time}] [${levelName}] ${clean}\n`);

  // 2. tulis ke console HANYA kalau level cukup (Info di prod)
  if (client.logger.has(level)) {
    originalWrite(level, ...values);
  }
};

async function main() {
  try {
    console.log('--- STARTING NOVA ---');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing di.env');

    const conn = await createDatabase(mongoUri);
    container.db = { user: User, item: Item, dungeon: Dungeon, connection: conn.connection };

    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info('🚀 Nova Sapphire sedang meluncur!');
  } catch (error) {
    client.logger.fatal(error instanceof Error ? error.stack || error.message : error);
    process.exit(1);
  }
}

main();

process.on('unhandledRejection', (err: any) => {
  if (err?.code === 'ECONNABORTED') return;
  client.logger.error('[UNHANDLED]:', err);
});

process.on('uncaughtException', (err: any) => {
  if (err?.code === 'ECONNABORTED') return;
  client.logger.error('[UNCAUGHT]:', err);
});
