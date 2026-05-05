import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';

@ApplyOptions<Command.Options>({
  description: 'Cek respon bot Nova',
  enabled: true,
  fullCategory: ['General'],
})
export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const startTime = Date.now();
    await interaction.deferReply();
    const endTime = Date.now();

    const apiLatency = endTime - startTime;
    const wsLatency = Math.round(this.container.client.ws.ping);

    const content =
      `Pong! 🏓\n` + `**Bot Latency:** ${wsLatency}ms\n` + `**API Latency:** ${apiLatency}ms`;

    return interaction.editReply(content);
  }
}
