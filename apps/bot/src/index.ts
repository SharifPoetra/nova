import './lib/setup';
import path from 'path';
import { GatewayIntentBits } from 'discord.js';
import { SapphireClient } from '@sapphire/framework';

const client = new SapphireClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  baseUserDirectory: path.join(__dirname),
  loadMessageCommandListeners: true,
  defaultGuildIds: ['641142881238646785'],
});

async function main() {
  try {
    // Cek log sebentar di terminal buat mastiin
    console.log('--- STARTING NOVA ---');
    console.log('Token exists:', !!process.env.DISCORD_TOKEN);
    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info('🚀 Nova Sapphire sedang meluncur!');
  } catch (error) {
    client.logger.fatal(error);
    // await db.$disconnect();
    process.exit(1);
  }
}

main();
