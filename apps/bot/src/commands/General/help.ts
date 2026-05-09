import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, MessageFlags } from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'help',
  description: 'Lihat semua command Nova',
  fullCategory: ['General'],
})
export class HelpCommand extends Command {
  public override registerApplicationCommands(registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o.setName('command').setDescription('Detail command').setAutocomplete(true),
        ),
    );
  }

  private async canUse(cmd: Command, interaction) {
    try {
      const result = await this.container.stores.get('preconditions').run(interaction, cmd, {});
      return result.isOk();
    } catch {
      if (cmd.requiredUserPermissions?.length) {
        return interaction.memberPermissions?.has(cmd.requiredUserPermissions);
      }
      return true;
    }
  }

  public getCommandDetail(cmd: Command) {
    const detail = (cmd as any).detailedDescription;

    const embed = new EmbedBuilder()
      .setTitle(`/${cmd.name}`)
      .setDescription(detail?.extendedHelp || cmd.description)
      .setColor(0x5865f2);

    if (detail?.usage)
      embed.addFields({ name: 'Usage', value: `\`${detail.usage}\``, inline: true });
    if (cmd.fullCategory?.length)
      embed.addFields({ name: 'Kategori', value: cmd.fullCategory[0], inline: true });

    return embed;
  }

  public buildMainEmbed(usable: Command[]) {
    const grouped = new Map<string, Command[]>();
    for (const cmd of usable) {
      const cat = cmd.fullCategory[0] || 'general';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(cmd);
    }

    const embed = new EmbedBuilder()
      .setTitle('📖 Nova Help')
      .setDescription(`Kamu bisa pakai **${usable.length}** command`)
      .setColor(0x5865f2);

    const emojis: Record<string, string> = { rpg: '🎮', general: '⚙️', fun: '🎲', admin: '🛠️' };
    for (const [cat, list] of [...grouped.entries()].sort()) {
      embed.addFields({
        name: `${emojis[cat] || '📁'} ${cat.toUpperCase()}`,
        value: list.map((c) => `\`/${c.name}\` — ${c.description}`).join('\n'),
      });
    }
    return embed;
  }

  public override async chatInputRun(interaction) {
    const all = [...this.container.stores.get('commands').values()];
    const usable: Command[] = [];
    for (const cmd of all) {
      if (cmd.name === 'help') continue;
      if (await this.canUse(cmd, interaction)) usable.push(cmd);
    }

    const target = interaction.options.getString('command');
    if (target) {
      const cmd = usable.find((c) => c.name === target);
      if (!cmd)
        return interaction.reply({ content: 'Tidak ditemukan', flags: MessageFlags.Ephemeral });

      const embed = this.getCommandDetail(cmd);
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    const embed = this.buildMainEmbed(usable);
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('help_select')
        .setPlaceholder('Pilih command untuk detail')
        .addOptions(
          usable.slice(0, 25).map((c) => ({
            label: `/${c.name}`,
            description: c.description.slice(0, 100),
            value: c.name,
          })),
        ),
    );

    return interaction.reply({
      embeds: [embed],
      components: [menu],
      flags: MessageFlags.Ephemeral,
    });
  }

  public override async autocompleteRun(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const all = [...this.container.stores.get('commands').values()];
    const list = [];
    for (const cmd of all) {
      if (cmd.name.includes(focused) && (await this.canUse(cmd, interaction))) list.push(cmd);
    }
    await interaction.respond(
      list.slice(0, 25).map((c) => ({ name: `/${c.name}`, value: c.name })),
    );
  }
}
