import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { codeBlock, EmbedBuilder, MessageFlags } from 'discord.js';
import util from 'node:util';

const SENSITIVE_PATTERNS = [
  /token/i,
  /mongodb.*uri/i,
  /password/i,
  /secret/i,
  /webhook.*https?:\/\//i,
  /process\.env/i,
  /child_process/i,
  /exec\s*\(/i,
  /spawn\s*\(/i,
  /fs\.write/i,
  /fs\.unlink/i,
  /require\s*\(\s*['"]fs['"]\s*\)/i,
];

@ApplyOptions<Command.Options>({
  name: 'eval',
  description: 'Owner eval (free access, filtered)',
  preconditions: ['OwnerOnly'],
})
export class EvalCommand extends Command {
  public override registerApplicationCommands(r: Command.Registry) {
    r.registerChatInputCommand((b) =>
      b
        .setName(this.name)
        .setDescription(this.description)
        .addStringOption((o) => o.setName('code').setDescription('JS code').setRequired(true))
        .addIntegerOption((o) =>
          o
            .setName('depth')
            .setDescription('Inspect depth (0-5)')
            .setMinValue(0)
            .setMaxValue(5)
            .setRequired(false),
        )
        .addBooleanOption((o) =>
          o.setName('ephemeral').setDescription('Hide output').setRequired(false),
        ),
    );
  }

  public async chatInputRun(i: Command.ChatInputCommandInteraction) {
    const code = i.options.getString('code', true);
    const depth = i.options.getInteger('depth') ?? 1;
    const ephemeral = i.options.getBoolean('ephemeral') ?? true;
    await i.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

    // filter sensitif
    if (SENSITIVE_PATTERNS.some((re) => re.test(code))) {
      return i.editReply('❌ Blocked: sensitive pattern detected');
    }

    const start = Date.now();
    try {
      // ctx bebas — semua yang biasa dipake
      const ctx: any = {
        // discord
        client: this.container.client,
        container: this.container,
        interaction: i,
        i,
        guild: i.guild,
        channel: i.channel,
        user: i.user,
        member: i.member,
        // db
        db: this.container.db,
        // utils
        util,
        // node (hati-hati, tapi owner only)
        require,
        process,
        console,
        // helpers
        sleep: (ms: number) => new Promise((r) => setTimeout(r, ms)),
      };

      // eval bebas pakai with
      const result = await (async () => {
        // eslint-disable-next-line no-new-func
        const fn = new Function('ctx', 'code', `with(ctx){ return (async () => eval(code))() }`);
        return fn(ctx, code);
      })();

      let output =
        typeof result === 'string' ? result : util.inspect(result, { depth, colors: false });

      // bersihin token
      output = output.replace(
        /[A-Za-z0-9_-]{24}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}/g,
        '[TOKEN_REDACTED]',
      );
      output = output.replace(/mongodb\+srv:\/\/[^@\s]+@[^\s]+/gi, '[MONGO_URI]');

      const took = Date.now() - start;

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Eval')
        .setDescription(codeBlock('js', code.slice(0, 1000)))
        .addFields(
          { name: 'Output', value: codeBlock('js', output.slice(0, 1000) || 'undefined') },
          { name: 'Type', value: `\`${typeof result}\``, inline: true },
          { name: 'Time', value: `\`${took}ms\``, inline: true },
        )
        .setFooter({ text: `Node ${process.version}` });

      return i.editReply({ embeds: [embed] });
    } catch (e: any) {
      const err = util.inspect(e, { depth });
      return i.editReply(`❌ ${codeBlock('js', err.slice(0, 1900))}`);
    }
  }
}
