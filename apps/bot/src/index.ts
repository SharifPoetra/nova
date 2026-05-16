import '@sapphire/plugin-i18next/register';
import dotenv from 'dotenv';
import path from 'path';
import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { setGlobalDispatcher, Agent } from 'undici';
import { GatewayIntentBits } from 'discord.js';
import {
  SapphireClient,
  container,
  ApplicationCommandRegistries,
  LogLevel,
} from '@sapphire/framework';
import { createDatabase, User, Item, Dungeon, Guild } from '@nova/db';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

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
  baseUserDirectory: __dirname,
  loadMessageCommandListeners: true,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  logger: {
    level: isProd ? LogLevel.Info : LogLevel.Debug, // <-- ini kuncinya
  },
  i18n: {
    fetchLanguage: async (context) => {
      if (context.user?.id) {
        const user = await container.db.user.findOne({ discordId: context.user.id }).lean();
        if (user?.lang) return user.lang;
      }
      if (context.guild?.id) {
        const guild = await container.db.guild.findOne({ guildId: context.guild.id }).lean();
        if (guild?.lang) return guild.lang;
      }
      const discordLocale = context.interactionGuildLocale ?? context.interactionLocale;
      if (discordLocale?.startsWith('id')) return 'id';
      return 'en-US'; // default EN
    },
    defaultLanguageDirectory: path.join(__dirname, 'locales'),
    defaultName: 'en-US',
    i18next: {
      returnEmptyString: false,
      interpolation: { escapeValue: false },
      initImmediate: false,
      load: 'currentOnly',
      fallbackLng: 'en-US',
      supportedLngs: ['id', 'en-US', 'en-GB'],
      preload: ['id', 'en-US', 'en-GB'],
      ns: [
        'common',
        'commands/names',
        'commands/descriptions',
        'commands/hunt',
        'commands/lang',
        'commands/help',
        'commands/ping',
        'commands/profile',
        'commands/cook',
        'commands/droprate',
        'commands/dungeon',
        'commands/explore',
        'commands/fish',
        'commands/inventory',
        'commands/sell',
        'commands/start',
        'commands/shop',
      ],
    },
  },
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
    container.db = {
      user: User,
      item: Item,
      dungeon: Dungeon,
      guild: Guild,
      connection: conn.connection,
    };

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
