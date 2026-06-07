import '@sapphire/plugin-i18next/register';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import { createWriteStream, existsSync, mkdirSync, WriteStream } from 'fs';
import { setGlobalDispatcher, Agent } from 'undici';
import { GatewayIntentBits } from 'discord.js';
import { SapphireClient, container, ApplicationCommandRegistries, LogLevel } from '@sapphire/framework';
import { createDatabase, User, UserBackground, Item, Dungeon, Guild } from '@nova/db';

// undici keepalive
setGlobalDispatcher(
  new Agent({
    connect: { timeout: 15000 },
    keepAliveTimeout: 1000,
    keepAliveMaxTimeout: 1000,
    pipelining: 1,
  }),
);

const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const devGuildIds = process.env.DEV_GUILD_IDS?.split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (devGuildIds?.length) {
    ApplicationCommandRegistries.setDefaultGuildIds(devGuildIds);
    console.log(`[DEV] Commands registered to ${devGuildIds.length} guilds`);
  }
}

// CACHE LANG
const CACHE_TTL = 5 * 60 * 1000; // 5 menit
const userLangCache = new Map<string, { lang: string; expires: number }>();
const guildLangCache = new Map<string, { lang: string; expires: number }>();

// export biar bisa di-invalidate dari /lang
export function invalidateLangCache(userId?: string, guildId?: string) {
  if (userId) userLangCache.delete(userId);
  if (guildId) guildLangCache.delete(guildId);
}

const client = new SapphireClient({
  baseUserDirectory: __dirname,
  loadMessageCommandListeners: true,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  logger: {
    level: isProd ? LogLevel.Info : LogLevel.Debug,
  },
  i18n: {
    fetchLanguage: async (context) => {
      const now = Date.now();
      const locale = context.interactionGuildLocale ?? context.interactionLocale;
      const fallback = locale?.startsWith('id') ? 'id' : 'en-US';

      if (context.user?.id) {
        const cached = userLangCache.get(context.user.id);
        if (cached) {
          if (cached.expires > now) return cached.lang;
          userLangCache.delete(context.user.id);
        }

        const user = await container.db.user.findOne({ discordId: context.user.id }).lean();
        if (user?.lang) {
          userLangCache.set(context.user.id, { lang: user.lang, expires: now + CACHE_TTL });
          return user.lang;
        }
        userLangCache.set(context.user.id, { lang: fallback, expires: now + CACHE_TTL });
        return fallback;
      }

      if (context.guild?.id) {
        const cached = guildLangCache.get(context.guild.id);
        if (cached) {
          if (cached.expires > now) return cached.lang;
          guildLangCache.delete(context.guild.id);
        }

        const guild = await container.db.guild.findOne({ guildId: context.guild.id }).lean();
        if (guild?.lang) {
          guildLangCache.set(context.guild.id, { lang: guild.lang, expires: now + CACHE_TTL });
          return guild.lang;
        }

        guildLangCache.set(context.guild.id, { lang: fallback, expires: now + CACHE_TTL });
        return fallback;
      }
      return fallback;
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
        'battle',
        'common',
        'dungeon/items',
        'dungeon/monsters',
        'dungeon/lore',
        'dungeon/events',
        'fish/species',
        'hunt/monsters',
        'hunt/items',
        'explore/items',
        'explore/events',
        'cook/recipes',
        'cook/items',
        'craft/items',
        'shop/items',
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
        'commands/daily',
        'commands/reset',
        'commands/craft',
        'commands/bgdesign',
        'commands/eval',
        'commands/simdroprate',
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
  if (isProd && level < LogLevel.Info) {
    if (client.logger.has(level)) originalWrite(level, ...values);
    return;
  }

  rotateIfNeeded();
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Kuching' });
  const levelName = LogLevel[level].toUpperCase();

  const msg = values
    .map((v) => {
      if (typeof v !== 'object' || v === null) return String(v);
      try {
        return isProd ? '[Object]' : JSON.stringify(v);
      } catch {
        return '[Circular]';
      }
    })
    .join(' ');
  const clean = msg.replace(/\u001b\[[0-9;]*m/g, ''); // eslint-disable-line no-control-regex
  fileStream.write(`[${time}] [${levelName}] ${clean}\n`);

  if (client.logger.has(level)) {
    originalWrite(level, ...values);
  }
};

async function main() {
  try {
    console.log('--- STARTING NOVA ---');
    const mongo = await createDatabase(process.env.MONGODB_URI);
    container.db = {
      user: User,
      userBackground: UserBackground,
      item: Item,
      dungeon: Dungeon,
      guild: Guild,
      connection: mongo.connection,
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
