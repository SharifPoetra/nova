import { Command } from '@sapphire/framework';
import { ApplyOptions } from '@sapphire/decorators';
import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from 'discord.js';

@ApplyOptions<Command.Options>({
  name: 'help',
  description: 'Lihat semua command Nova',
  detailedDescription: {
    usage: '/help [command:optional]',
    examples: ['/help', '/help command:fish', '/help command:profile'],
    extendedHelp: `
Pusat bantuan interaktif Nova.

**Cara pakai:**
- /help — lihat daftar semua command yang bisa kamu pakai
- /help command:... — langsung lihat detail (autocomplete tersedia)
- Pilih dari dropdown menu untuk detail cepat

**Fitur:**
- Hanya menampilkan command yang kamu punya izin
- Menampilkan usage, contoh, dan penjelasan lengkap
- Dikelompokkan per kategori (RPG, Economy, General)
- Private reply (ephemeral)

Tips: ketik /help lalu pilih /fish untuk lihat droprate ikan.
    `.trim(),
  },
  fullCategory: ['General'],
})
export class HelpCommand extends Command {
  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) =>
          o.setName('command').setDescription('Detail command').setAutocomplete(true),
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

  public getCommandDetail(cmd: Command) {
    const detail = (cmd as any).detailedDescription;
    return new EmbedBuilder()
      .setTitle(`/${cmd.name}`)
      .setDescription(detail?.extendedHelp || cmd.description)
      .setColor(0x5865f2)
      .addFields(
        ...(detail?.usage ? [{ name: 'Usage', value: `\`${detail.usage}\``, inline: true }] : []),
        ...(cmd.fullCategory?.length
          ? [{ name: 'Kategori', value: cmd.fullCategory[0], inline: true }]
          : []),
      );
  }

  public buildMainEmbed(usable: Command[]) {
    const grouped = new Map<string, Command[]>();
    for (const cmd of usable) {
      const cat = cmd.fullCategory?.[0] || 'general';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(cmd);
    }

    const embed = new EmbedBuilder()
      .setTitle('📖 Nova Help')
      .setDescription(`Kamu bisa pakai **${usable.length}** command`)
      .setColor(0x5865f2);

    const emojis: Record<string, string> = {
      rpg: '🎮',
      economy: '💰',
      general: '⚙️',
      fun: '🎲',
      admin: '🛠️',
    };
    for (const [cat, list] of [...grouped.entries()].sort()) {
      embed.addFields({
        name: `${emojis[cat] || '📁'} ${cat.toUpperCase()}`,
        value: list.map((c) => `\`/${c.name}\` — ${c.description}`).join('\n'),
      });
    }
    return embed;
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const all = [...this.container.stores.get('commands').values()] as Command[];
    const usable: Command[] = [];
    for (const cmd of all) {
      if (await this.canUse(cmd, interaction)) usable.push(cmd);
    }

    const target = interaction.options.getString('command');
    if (target) {
      const cmd = usable.find((c) => c.name === target);
      if (!cmd) return interaction.editReply({ content: 'Tidak ditemukan' });
      return interaction.editReply({ embeds: [this.getCommandDetail(cmd)] });
    }

    const embed = this.buildMainEmbed(usable);
    const menu = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`help_select_${interaction.user.id}`)
        .setPlaceholder('Pilih command untuk detail')
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
                .setFooter({ text: '⏰ Waktu habis (2 menit) — ketik /help lagi' }),
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
