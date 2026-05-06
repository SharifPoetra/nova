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

    // Set activity bot di sini
    this.container.client.user?.setActivity('Economy 2.0 | /help');

    // STAMINA REGEN
    setInterval(
      async () => {
        try {
          const result = await this.container.db.user.collection.updateMany(
            { $expr: { $lt: ['$stamina', '$maxStamina'] } },
            [
              {
                $set: {
                  stamina: {
                    $min: [{ $add: ['$stamina', 5] }, '$maxStamina'],
                  },
                  updatedAt: new Date(),
                },
              },
            ],
          );
          if (result.modifiedCount > 0) {
            this.container.logger.info(`⚡ Regen: ${result.modifiedCount} user +5 stamina`);
          }
        } catch (e) {
          this.container.logger.error('Stamina regen error', e);
        }
      },
      5 * 60 * 1000,
    );
  }
}
