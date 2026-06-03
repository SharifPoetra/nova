import { Command } from '@sapphire/framework';
import type { SlashCommandBuilder } from 'discord.js';

export abstract class OwnerDevCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      preconditions: [...(options.preconditions ?? []), 'OwnerOnly'],
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    const raw = process.env.DEV_GUILD_IDS || process.env.DEV_GUILD_ID;
    if (!raw) {
      this.container.logger.warn('[OwnerDev] DEV_GUILD_IDS not set, skip register');
      return;
    }

    const guildIds = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    registry.registerChatInputCommand((builder) => this.configure(builder), { guildIds });
  }

  protected abstract configure(builder: SlashCommandBuilder): any;
}
