import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { GatewayIntentBits } from 'discord.js';
import { SapphireClient, container, ApplicationCommandRegistries } from '@sapphire/framework';
import { createDatabase, User, Item } from '@nova/db';

// load .env dari root project, bukan dari apps/bot
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
  baseUserDirectory: path.dirname(fileURLToPath(import.meta.url)),
  loadMessageCommandListeners: true,
});

async function main() {
  try {
    // Cek log sebentar di terminal buat mastiin
    console.log('--- STARTING NOVA ---');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI missing di .env');

    await createDatabase(mongoUri);

    container.db = {
      user: User,
      item: Item,
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
