import { Precondition } from '@sapphire/framework';
import { CommandInteraction } from 'discord.js';

export class OwnerOnlyPrecondition extends Precondition {
  public override chatInputRun(interaction: CommandInteraction) {
    return interaction.user.id === process.env.OWNER_ID
      ? this.ok()
      : this.error({ message: 'Hanya owner bot' });
  }
}

declare module '@sapphire/framework' {
  interface Preconditions {
    OwnerOnly: never;
  }
}
