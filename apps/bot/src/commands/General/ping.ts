import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { EmbedBuilder } from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Command.Options>({
  name: 'ping',
  description: 'Check Nova bot response',
  fullCategory: ['General'],
})
export class PingCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(builder, 'commands/names:ping', 'commands/descriptions:ping'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
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
      .setAuthor({
        name: t('commands/ping:author', { defaultValue: 'Nova Status' }),
        iconURL: this.container.client.user?.displayAvatarURL(),
      })
      .setDescription(t('commands/ping:description', { defaultValue: 'Pong! 🏓' }))
      .addFields(
        {
          name: t('commands/ping:websocket', { defaultValue: 'WebSocket' }),
          value: `\`${wsLatency}ms\``,
          inline: true,
        },
        {
          name: t('commands/ping:api', { defaultValue: 'API' }),
          value: `\`${apiLatency}ms\``,
          inline: true,
        },
        {
          name: t('commands/ping:database', { defaultValue: 'Database' }),
          value: `\`${dbLatency}ms\``,
          inline: true,
        },
        {
          name: t('commands/ping:uptime', { defaultValue: 'Uptime' }),
          value: uptime,
          inline: false,
        },
      )
      .setFooter({
        text: t('commands/ping:footer', {
          shard: interaction.guild?.shardId ?? 0,
          defaultValue: `Shard ${interaction.guild?.shardId ?? 0}`,
        }),
      })
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
