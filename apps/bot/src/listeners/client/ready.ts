import { Listener } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { ActivityType } from 'discord.js';

@ApplyOptions<Listener.Options>({
  once: true,
  event: 'clientReady',
})
export class ReadyListener extends Listener {
  public async run() {
    await this.container.client.application?.commands.set([]);
    const { tag, id } = this.container.client.user!;

    this.container.logger.info('--- NOVA SAPPHIRE LOG ---');
    this.container.logger.info(`✅ Status: Online`);
    this.container.logger.info(`🤖 User : ${tag}`);
    this.container.logger.info(`🆔 ID : ${id}`);
    this.container.logger.info('----------------------');

    // === NOVA ROTATING ACTIVITY ===
    const activities = [
      { name: '/help • Nova RPG', type: ActivityType.Playing },
      { name: `${this.container.client.guilds.cache.size} servers`, type: ActivityType.Watching },
      { name: 'since 2019', type: ActivityType.Competing },
      { name: 'Economy 2.0', type: ActivityType.Playing },
      { name: '/dungeon /hunt /fish', type: ActivityType.Listening },
      { name: 'github.com/SharifPoetra/nova', type: ActivityType.Watching },
    ];

    let index = 0;
    const setActivity = () => {
      activities[1].name = `${this.container.client.guilds.cache.size} servers`;

      this.container.client.user?.setActivity(activities[index]);
      index = (index + 1) % activities.length;
    };

    setActivity();
    setInterval(setActivity, 15_000);

    this.container.logger.info(`🎮 Activity rotation started (${activities.length} statuses)`);
  }
}
