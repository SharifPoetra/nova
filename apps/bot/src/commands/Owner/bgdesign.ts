import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { OwnerDevCommand } from '../../lib/bases/OwnerDevCommand';
import { localized } from '../../lib/i18n/localize';
import { fetchT } from '@sapphire/plugin-i18next';

type Palette = { c1: string; c2: string; accent: string };

const PALETTES: Record<string, Palette> = {
  midnight: { c1: '#020617', c2: '#0f172a', accent: '#38bdf8' },
  nebula: { c1: '#0f0c29', c2: '#302b63', accent: '#a855f7' },
  sakura: { c1: '#1a0b14', c2: '#4c1d3d', accent: '#f472b6' },
  forest: { c1: '#052e16', c2: '#14532d', accent: '#22c55e' },
  ocean: { c1: '#082f49', c2: '#0c4a6e', accent: '#0ea5e9' },
  sunset: { c1: '#431407', c2: '#7c2d12', accent: '#f97316' },
  cyber: { c1: '#000000', c2: '#0a0a0a', accent: '#00ff88' },
  royal: { c1: '#1e1b4b', c2: '#312e81', accent: '#818cf8' },
  crimson: { c1: '#450a0a', c2: '#7f1d1d', accent: '#ef4444' },
  gold: { c1: '#422006', c2: '#713f12', accent: '#facc15' },
  ice: { c1: '#0c1e2a', c2: '#164e63', accent: '#67e8f9' },
  void: { c1: '#000000', c2: '#171717', accent: '#737373' },
};

@ApplyOptions<Command.Options>({
  name: 'bgdesign',
  description: 'Advanced background designer for profile cards (Owner only)',
})
export class BgDesignCommand extends OwnerDevCommand {
  public override registerApplicationCommands(registry: Command.Registry) {
    const name = localized('commands/names:bgdesign');
    const description = localized('commands/descriptions:bgdesign');

    registry.registerChatInputCommand((builder) =>
      this.configure(
        builder
          .setName(name.default)
          .setNameLocalizations(name.localizations)
          .setDescription(description.default)
          .setDescriptionLocalizations(description.localizations),
      ),
    );
  }

  public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
    const t = await fetchT(interaction);
    const style = interaction.options.getString('style', true);
    const paletteName = interaction.options.getString('palette', true);
    const pattern = interaction.options.getString('pattern') || 'none';
    const intensity = interaction.options.getInteger('intensity') || 5;
    const text = interaction.options.getString('text') || '';
    const format = interaction.options.getString('format') || 'png';
    const save = interaction.options.getBoolean('save') || false;

    await interaction.deferReply();

    const palette = PALETTES[paletteName];
    const canvas = createCanvas(600, 600);
    const ctx = canvas.getContext('2d');

    // === BASE RENDER ===
    switch (style) {
      case 'default': {
        const bg = ctx.createLinearGradient(0, 0, 600, 600);
        bg.addColorStop(0, '#0f0c29');
        bg.addColorStop(0.5, '#1b183a');
        bg.addColorStop(1, '#14142a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 600, 600);
        ctx.save();
        ctx.globalAlpha = 0.04;
        ctx.fillStyle = '#ffffff';
        for (let x = 0; x < 600; x += 20) ctx.fillRect(x, 0, 1, 600);
        for (let y = 0; y < 600; y += 20) ctx.fillRect(0, y, 600, 1);
        ctx.restore();
        break;
      }
      case 'gradient': {
        const g = ctx.createLinearGradient(0, 0, 600, 600);
        g.addColorStop(0, palette.c1);
        g.addColorStop(1, palette.c2);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 600, 600);
        break;
      }
      case 'radial': {
        const r = ctx.createRadialGradient(300, 200, 0, 300, 300, 500);
        r.addColorStop(0, palette.c2);
        r.addColorStop(1, palette.c1);
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, 600, 600);
        break;
      }
      case 'aurora': {
        ctx.fillStyle = palette.c1;
        ctx.fillRect(0, 0, 600, 600);
        for (let i = 0; i < 3; i++) {
          const ag = ctx.createLinearGradient(0, i * 200, 600, i * 200 + 300);
          ag.addColorStop(0, `${palette.accent}00`);
          ag.addColorStop(
            0.5,
            `${palette.accent}${Math.floor(intensity * 25.5)
              .toString(16)
              .padStart(2, '0')}`,
          );
          ag.addColorStop(1, `${palette.accent}00`);
          ctx.fillStyle = ag;
          ctx.fillRect(0, 0, 600, 600);
        }
        break;
      }
      case 'mesh': {
        ctx.fillStyle = palette.c1;
        ctx.fillRect(0, 0, 600, 600);
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(100 + i * 120, 150 + (i % 2) * 200, 180, 0, Math.PI * 2);
          ctx.fillStyle = palette.accent;
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'waves': {
        ctx.fillStyle = palette.c2;
        ctx.fillRect(0, 0, 600, 600);
        ctx.strokeStyle = palette.accent;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.15;
        for (let y = 0; y < 600; y += 30) {
          ctx.beginPath();
          for (let x = 0; x <= 600; x += 10) {
            const dy = Math.sin((x + y) * 0.02) * intensity * 3;
            ctx.lineTo(x, y + dy);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        break;
      }
      case 'glow_orbs': {
        ctx.fillStyle = palette.c1;
        ctx.fillRect(0, 0, 600, 600);
        for (let i = 0; i < 4; i++) {
          const x = 150 + (i % 2) * 300;
          const y = 150 + Math.floor(i / 2) * 300;
          const orb = ctx.createRadialGradient(x, y, 0, x, y, 120);
          orb.addColorStop(0, `${palette.accent}aa`);
          orb.addColorStop(1, `${palette.accent}00`);
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(x, y, 120, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    // === PATTERNS ===
    if (style !== 'default' && pattern !== 'none') {
      ctx.globalAlpha = intensity / 10;
      if (pattern === 'grid') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let i = 0; i < 600; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 600);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(600, i);
          ctx.stroke();
        }
      } else if (pattern === 'dots') {
        ctx.fillStyle = '#ffffff';
        for (let x = 20; x < 600; x += 40)
          for (let y = 20; y < 600; y += 40) {
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
      } else if (pattern === 'hex') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        const size = 35;
        for (let y = -50; y < 650; y += size * 1.5)
          for (let x = -50; x < 650; x += size * 1.732) {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i;
              const px = x + size * Math.cos(angle);
              const py = y + size * Math.sin(angle) + (x % 2 === 0 ? 0 : size * 0.75);
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
      } else if (pattern === 'noise') {
        const imgData = ctx.getImageData(0, 0, 600, 600);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const v = Math.random() * 40;
          imgData.data[i] += v;
          imgData.data[i + 1] += v;
          imgData.data[i + 2] += v;
        }
        ctx.putImageData(imgData, 0, 0);
      }
      ctx.globalAlpha = 1;
    }

    // === VIGNETTE ===
    if (style !== 'default') {
      const vig = ctx.createRadialGradient(300, 300, 200, 300, 300, 350);
      vig.addColorStop(0, '#00000000');
      vig.addColorStop(1, '#00000099');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, 600, 600);
    }

    // === TEXT ===
    if (text && style !== 'default') {
      ctx.font = '700 56px "Rajdhani-SemiBold"';
      ctx.fillStyle = `${palette.accent}22`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), 300, 310);
    }

    const buf = format === 'jpg' ? await canvas.encode('jpeg', 85) : await canvas.encode('png');
    const baseName =
      style === 'default' ? 'default' : `${style}-${paletteName}${pattern !== 'none' ? `-${pattern}` : ''}`;
    const filename = `${baseName}.${format}`;
    const file = new AttachmentBuilder(buf, { name: filename });

    if (save) {
      const saveDir = join(__dirname, '../../../assets/backgrounds');
      if (!existsSync(saveDir)) mkdirSync(saveDir, { recursive: true });
      writeFileSync(join(saveDir, filename), buf);
    }

    const sizeKB = (buf.length / 1024).toFixed(1);
    const sizeStatus =
      buf.length > 300 * 1024
        ? t('commands/bgdesign:size_large')
        : buf.length > 200 * 1024
          ? t('commands/bgdesign:size_medium')
          : t('commands/bgdesign:size_opt');

    const embed = new EmbedBuilder()
      .setTitle(
        style === 'default'
          ? t('commands/bgdesign:default_title')
          : t('commands/bgdesign:preview_title', { style, palette: paletteName }),
      )
      .setDescription(
        style === 'default'
          ? t('commands/bgdesign:default_desc')
          : t('commands/bgdesign:pattern_info', { pattern, intensity }),
      )
      .addFields(
        { name: t('commands/bgdesign:dimensions'), value: '`600×600`', inline: true },
        { name: t('commands/bgdesign:filesize'), value: `\`${sizeKB} KB\` ${sizeStatus}`, inline: true },
        { name: t('commands/bgdesign:format'), value: `\`${format.toUpperCase()}\``, inline: true },
        ...(save
          ? [{ name: t('commands/bgdesign:saved'), value: `\`assets/backgrounds/${filename}\``, inline: false }]
          : []),
      )
      .setImage(`attachment://${filename}`)
      .setFooter({ text: save ? t('commands/bgdesign:footer_save') : t('commands/bgdesign:footer_preview') })
      .setColor(style === 'default' ? 0x1b183a : parseInt(palette.accent.replace('#', ''), 16));

    await interaction.editReply({ embeds: [embed], files: [file] });
  }

  protected configure(builder: any) {
    return builder
      .addStringOption((opt: any) =>
        opt
          .setName('style')
          .setDescription('Base style')
          .setRequired(true)
          .addChoices(
            { name: 'Nova Default (original)', value: 'default' },
            { name: 'Gradient', value: 'gradient' },
            { name: 'Radial', value: 'radial' },
            { name: 'Aurora', value: 'aurora' },
            { name: 'Mesh Blobs', value: 'mesh' },
            { name: 'Waves', value: 'waves' },
            { name: 'Glow Orbs', value: 'glow_orbs' },
          ),
      )
      .addStringOption((opt: any) =>
        opt
          .setName('palette')
          .setDescription('Color theme')
          .setRequired(true)
          .addChoices(
            ...Object.keys(PALETTES).map((k) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: k })),
          ),
      )
      .addStringOption((opt: any) =>
        opt
          .setName('pattern')
          .setDescription('Overlay pattern')
          .addChoices(
            { name: 'None', value: 'none' },
            { name: 'Grid', value: 'grid' },
            { name: 'Dots', value: 'dots' },
            { name: 'Hex', value: 'hex' },
            { name: 'Noise', value: 'noise' },
          ),
      )
      .addIntegerOption((opt: any) =>
        opt.setName('intensity').setDescription('Pattern intensity 1-10').setMinValue(1).setMaxValue(10),
      )
      .addStringOption((opt: any) => opt.setName('text').setDescription('Optional watermark text'))
      .addStringOption((opt: any) =>
        opt
          .setName('format')
          .setDescription('Export format')
          .addChoices({ name: 'PNG (lossless)', value: 'png' }, { name: 'JPG (small)', value: 'jpg' }),
      )
      .addBooleanOption((opt: any) => opt.setName('save').setDescription('Save directly to assets/backgrounds'));
  }
}
