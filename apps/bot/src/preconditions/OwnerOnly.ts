import { Precondition } from '@sapphire/framework';

export class OwnerOnlyPrecondition extends Precondition {
  public override chatInputRun(interaction: any) {
    return interaction.user.id === process.env.OWNER_ID
      ? this.ok()
      : this.error({ message: 'Hanya owner bot' });
  }
}
