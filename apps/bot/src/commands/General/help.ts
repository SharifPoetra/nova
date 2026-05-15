import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
  type Interaction,
} from 'discord.js';
import { applyLocalizedBuilder, fetchT } from '@sapphire/plugin-i18next';

@ApplyOptions<Command.Options>({
  name: 'help',
  description: 'View all Nova commands',
  fullCategory: ['General'],
})
export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      applyLocalizedBuilder(
        builder,
        'commands/names:help',
        'commands/descriptions:help',
      ).addStringOption((o) =>
        o
          .setName('command')
          .setDescription('View command details')
          .setDescriptionLocalizations({
            'en-US': 'View command details',
            'en-GB': 'View command details',
            id: 'Lihat detail command',
          })
          .setAutocomplete(true),
      ),
    );
  }

  private async canUse(cmd: Command, interaction: ChatInputCommandInteraction) {
    const perms = (cmd.options as any).requiredUserPermissions as bigint[] | undefined;
    const preconditions = (cmd.options.preconditions as string[]) || [];
    if (preconditions.includes('OwnerOnly') && interaction.user.id !== process.env.OWNER_ID)
      return false;
    if (perms?.length) return interaction.memberPermissions?.has(perms) ?? false;
    return true;
  }

  public async getCommandDetail(cmd: Command, interaction: Interaction) {
    const t = await fetchT(interaction);
    const key = `commands/${cmd.name}`;

    return new EmbedBuilder()
      .setTitle(`/${cmd.name}`)
      .setDescription(t(`${key}:extended_help`, { defaultValue: cmd.description }))
      .setColor(0x5865f2)
      .addFields(
        {
          name: t('common:usage', { defaultValue: 'Usage' }),
          value: `\`${t(`${key}:usage`, { defaultValue: `/${cmd.name}` })}\``,
          inline: true,
        },
        ...(cmd.fullCategory?.length
          ? [
              {
                name: t('common:category', { defaultValue: 'Category' }),
                value: t(`common:categories.${cmd.fullCategory[0].toLowerCase()}`, {
                  defaultValue: cmd.fullCategory[0],
                }),
                inline: true,
              },
            ]
          : []),
      );
  }

  public async buildMainEmbed(usable: Command[], interaction: Interaction) {
    const t = await fetchT(interaction);
    const grouped = new Map<string, Command[]>();

    for (const cmd of usable) {
      const cat = cmd.fullCategory?.[0] || 'general';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(cmd);
    }

    const embed = new EmbedBuilder()
      .setTitle(t('commands/help:main_title', { defaultValue: '📖 Nova Help' }))
      .setDescription(
        t('commands/help:main_desc', {
          count: usable.length,
          defaultValue: `You can use **${usable.length}** commands`,
        }),
      )
      .setColor(0x5865f2);

    const emojis: Record<string, string> = { rpg: '⚔️', economy: '💰', general: '📜', owner: '👑' };

    for (const [cat, list] of [...grouped.entries()].sort()) {
      embed.addFields({
        name: `${emojis[cat.toLowerCase()] || '📁'} ${t(`common:categories.${cat.toLowerCase()}`, { defaultValue: cat.toUpperCase() })}`,
        value: list.map((c) => `\`/${c.name}\` — ${c.description}`).join('\n'),
      });
    }
    return embed;
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const t = await fetchT(interaction);

    const all = [...this.container.stores.get('commands').values()] as Command[];
    const usable: Command[] = [];
    for (const cmd of all) {
      if (await this.canUse(cmd, interaction)) usable.push(cmd);
    }

    const target = interaction.options.getString('command');
    if (target) {
      const cmd = usable.find((c) => c.name === target);
      if (!cmd)
        return interaction.editReply({
          content: t('commands/help:not_found', { defaultValue: 'Not found' }),
        });
      return interaction.editReply({ embeds: [await this.getCommandDetail(cmd, interaction)] });
    }

    const embed = await this.buildMainEmbed(usable, interaction);
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`help_select_${interaction.user.id}`)
        .setPlaceholder(
          t('commands/help:select_placeholder', { defaultValue: 'Select command for details' }),
        )
        .addOptions(
          usable.slice(0, 25).map((c) => ({
            label: `/${c.name}`,
            description: c.description.slice(0, 100),
            value: c.name,
          })),
        ),
    );

    await interaction.editReply({ embeds: [embed], components: [menu] });

    setTimeout(
      () =>
        interaction
          .editReply({
            components: [],
            embeds: [
              EmbedBuilder.from(embed)
                .setColor(0x95a5a6)
                .setFooter({
                  text: t('commands/help:timeout', {
                    defaultValue: '⏰ Timeout (2 minutes) — type /help again',
                  }),
                }),
            ],
          })
          .catch(() => {}),
      300_000,
    );
  }

  public override async autocompleteRun(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const all = [...this.container.stores.get('commands').values()] as Command[];
    const list: Command[] = [];
    for (const cmd of all)
      if (cmd.name.includes(focused) && (await this.canUse(cmd, interaction as any)))
        list.push(cmd);
    await interaction.respond(
      list.slice(0, 25).map((c) => ({ name: `/${c.name}`, value: c.name })),
    );
  }
}
