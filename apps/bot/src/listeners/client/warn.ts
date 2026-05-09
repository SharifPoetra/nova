import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
  event: 'warn',
  name: 'clientWarn',
})
export class ClientWarnListener extends Listener {
  public override run(message: string) {
    this.container.logger.warn(`[CLIENT WARN] ${message}`);
  }
}
