import { Client, GatewayIntentBits, Events } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config({
  path: "../../.env"
});

const client = new Client({
  intents:[
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
    ]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, (message) => {
  if (message.author.bot) return;
  if (message.content === "!ping") {
    message.reply("Pong!");
  }
});

client.login(process.env.DISCORD_TOKEN);
