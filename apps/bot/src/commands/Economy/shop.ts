import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';
import { applyPassiveRegen } from '../../lib/rpg/buffs.ts';
import { buildShopMain } from '../../lib/shop/ui.ts';

@ApplyOptions({
  name: 'shop',
  description: 'Buy items at Nova Shop',
  fullCategory: ['Economy'],
})
export class ShopCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((b) =>
      applyLocalizedBuilder(b, 'commands/names:shop', 'commands/descriptions:shop'),
    );
  }

  public async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    await interaction.deferReply();

    const user = await this.container.db.user.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply({
        content: t('common:need_start', { defaultValue: '❌ You need to start first. Use `/start`.' }),
      });
    }

    applyPassiveRegen(user);
    await user.save();

    // Main shop embed
    const shopMain = buildShopMain(interaction.user.id, user.balance, t);

    await interaction.editReply(shopMain);
  }
}
