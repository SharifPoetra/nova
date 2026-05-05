import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';

@ApplyOptions<Command.Options>({
  description: 'Cek respon bot Nova',
  enabled: true,
  fullCategory: ['Utility'],
})
export class PingCommand extends Command {
  public async messageRun(message: Message) {
    const msg = await message.reply('Pinging...');

    const content =
      `Pong! 🏓\n` +
      `Bot Latency: ${Math.round(this.container.client.ws.ping)}ms\n` +
      `API Latency: ${msg.createdTimestamp - message.createdTimestamp}ms`;

    return msg.edit(content);
  }
}
