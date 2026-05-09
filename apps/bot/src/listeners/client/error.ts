import { ApplyOptions } from '@sapphire/decorators';
import { Listener, Events } from '@sapphire/framework';

@ApplyOptions<Listener.Options>({
  event: Events.Error,
  name: 'clientError',
})
export class ClientErrorListener extends Listener {
  public override run(error: Error) {
    this.container.logger.error('[CLIENT ERROR]', error);
  }
}
