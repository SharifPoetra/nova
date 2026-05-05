import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Listener.Options>({
  once: true, // Listener ini hanya berjalan sekali (seperti client.once)
  event: 'clientReady',
})
export class ReadyListener extends Listener {
  public async run() {
    // await this.container.client.application?.commands.set([]);
    const { tag, id } = this.container.client.user!;

    this.container.logger.info('--- NOVA SAPPHIRE LOG ---');
    this.container.logger.info(`✅ Status: Online`);
    this.container.logger.info(`🤖 User  : ${tag}`);
    this.container.logger.info(`🆔 ID    : ${id}`);
    this.container.logger.info('--------------------------');

    // Kamu bisa set activity bot di sini
    this.container.client.user?.setActivity('Economy 2.0 | /help');
  }
}
