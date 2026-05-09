import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'ping',
  description: 'Cek respon bot Nova',
  fullCategory: ['General'],
})
export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) => b.setName(this.name).setDescription(this.description));
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const start = Date.now();
    await interaction.deferReply({ withResponse: true });
    const apiLatency = Date.now() - start;
    const wsLatency = this.container.client.ws.ping;

    // DB ping
    const dbStart = Date.now();
    await this.container.db.connection
      .db!.admin()
      .ping()
      .catch(() => {});
    const dbLatency = Date.now() - dbStart;

    const uptime = this.formatUptime(process.uptime() * 1000);
    const color = wsLatency < 150 ? 0x2ecc71 : wsLatency < 300 ? 0xf1c40f : 0xe74c3c;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setAuthor({ name: 'Nova Status', iconURL: this.container.client.user?.displayAvatarURL() })
      .setDescription('Pong! 🏓')
      .addFields(
        { name: 'WebSocket', value: `\`${wsLatency}ms\``, inline: true },
        { name: 'API', value: `\`${apiLatency}ms\``, inline: true },
        { name: 'Database', value: `\`${dbLatency}ms\``, inline: true },
        { name: 'Uptime', value: uptime, inline: false },
      )
      .setFooter({ text: `Shard ${interaction.guild?.shardId ?? 0}` })
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  private formatUptime(ms: number) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  }
}
