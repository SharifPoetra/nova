import dotenv from 'dotenv';
import path from 'path';
import { GatewayIntentBits } from 'discord.js';
import { SapphireClient, container, ApplicationCommandRegistries } from '@sapphire/framework';
import { createDatabase, User, Item, Dungeon } from '@nova/db';
import { logger } from './lib/logger';

// load.env dari root project
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const devGuildId = process.env.DEV_GUILD_ID;
if (process.env.NODE_ENV === 'development' && devGuildId) {
  ApplicationCommandRegistries.setDefaultGuildIds([devGuildId]);
}

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  logger: {
    instance: logger,
  },
  baseUserDirectory: __dirname,
  loadMessageCommandListeners: true,
});

async function main() {
  process.on('unhandledRejection', e => console.error('[REJECT]', e));
  process.on('uncaughtException', e => console.error('[EXCEPT]', e));

  try {
    console.log('--- STARTING NOVA ---');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing di.env');

    const conn = await createDatabase(mongoUri);

    container.db = {
      user: User,
      item: Item,
      dungeon: Dungeon,
      connection: conn.connection,
    };

    console.log('Token exists:', !!process.env.DISCORD_TOKEN);

    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info('🚀 Nova Sapphire sedang meluncur!');
  } catch (error) {
    client.logger.fatal(error);
    process.exit(1);
  }
}

main();
