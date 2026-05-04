import { GatewayIntentBits, Events } from "discord.js";
import { SapphireClient } from "@sapphire/framework";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "../../.env")
});

const client = new SapphireClient({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
    ],
  baseUserDirectory: path.join(__dirname),
  loadMessageCommandListeners: true,
  defaultGuildIds: ['ID_SERVER_KAMU_DI_SINI']
});

async function main() {
    try {
        await client.login(process.env.DISCORD_TOKEN);
        client.logger.info('🚀 Nova Sapphire sedang meluncur!');
    } catch (error) {
        client.logger.fatal(error);
        process.exit(1);
    }
}

main();
