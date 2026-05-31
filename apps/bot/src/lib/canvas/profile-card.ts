import { createCanvas, loadImage, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'path';
import { existsSync } from 'fs';

const fontDir = join(__dirname, '../../../assets/fonts');

const FONTS: Array<[string, string]> = [
  ['NotoRegular.ttf', 'NotoRegular'],
  ['NotoEmoji.ttf', 'NotoEmoji'],
  ['Orbitron-Bold.ttf', 'Orbitron-Bold'],
  ['Rajdhani-Regular.ttf', 'Rajdhani-Regular'],
  ['Rajdhani-SemiBold.ttf', 'Rajdhani-SemiBold'],
];

try {
  FONTS.forEach(([file, name]) => {
    const p = join(fontDir, file);
    if (existsSync(p)) GlobalFonts.registerFromPath(p, name);
  });
} catch {
  /* ignore */
}

export interface EquipmentItem {
  emoji: string;
  name: string;
}
export interface SkillItem {
  emoji: string;
  name: string;
}
export interface ProfileData {
  username: string;
  avatarURL: string;
  level: number;
  exp: number;
  expNeeded: number;
  balance: number;
  bank: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  atk: number;
  def: number;
  critRate: number;
  critDmg: number;
  bonusAtk: number;
  className: string;
  classEmoji: string;
  classColor: string;
  equipment: EquipmentItem[];
  skills: SkillItem[];
  buffs: string[];
  itemCount: number;
  nextUnlock: string;
}

const LAYOUT = {
  baseW: 600,
  baseH: 600,
  panelLeft: { x: 20, y: 20, w: 260, h: 260 },
  panelRight: { x: 300, y: 20, w: 280, h: 260 },
  panelBottom: { x: 20, y: 300, w: 560, h: 280 },
  avatar: { x: 150, y: 105, r: 58 },
};

const COLORS = {
  panel: 'rgba(12, 14, 28, 0.65)',
  border: 'rgba(255, 255, 255, 0.06)',
};

function drawRoundedRect(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string,
  strokeStyle?: string,
  lineWidth = 1,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawTextWithShadow(
  ctx: SKRSContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
  shadowColor = 'rgba(0,0,0,0.6)',
  shadowBlur = 2,
) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawProgressBar(
  ctx: SKRSContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  value: number,
  max: number,
  bgColor: string,
  fillStart: string,
  fillEnd: string,
  label: string,
) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  drawRoundedRect(ctx, x, y, w, h, h / 2, bgColor);
  drawRoundedRect(ctx, x + 1, y + 1, w - 2, h - 2, (h - 2) / 2, 'rgba(0,0,0,0.45)');
  const fillW = Math.max(0, (w - 2) * pct);
  if (fillW > 1) {
    ctx.save();
    drawRoundedRect(ctx, x + 1, y + 1, fillW, h - 2, (h - 2) / 2);
    ctx.clip();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, fillStart);
    grad.addColorStop(1, fillEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(x + 1, y + 1, fillW, h - 2);
    const gloss = ctx.createLinearGradient(x, y, x, y + h);
    gloss.addColorStop(0, 'rgba(255,255,255,0.22)');
    gloss.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gloss;
    ctx.fillRect(x + 1, y + 1, fillW, (h - 2) / 2);
    ctx.restore();
  }
  drawTextWithShadow(
    ctx,
    label,
    x + 9,
    y + h / 2,
    'bold 12px Rajdhani-SemiBold, NotoEmoji',
    'rgba(255,255,255,0.95)',
    'left',
    'rgba(0,0,0,0.8)',
    2,
  );
  const valueText = `${formatNumber(value)}/${formatNumber(max)} (${Math.floor(pct * 100)}%)`;
  drawTextWithShadow(
    ctx,
    valueText,
    x + w - 9,
    y + h / 2,
    '900 12px Rajdhani-Regular',
    'rgba(255,255,255,0.95)',
    'right',
    'rgba(0,0,0,0.8)',
    2,
  );
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const num = parseInt(full, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

function formatNumber(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function emojiFont(size: number) {
  return `${size}px NotoRegular, NotoEmoji`;
}

async function drawAvatar(ctx: SKRSContext2D, data: ProfileData) {
  const { x, y, r } = LAYOUT.avatar;

  ctx.save();
  ctx.shadowColor = data.classColor;
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(data.classColor, 0.85);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  try {
    const avatar = await loadImage(data.avatarURL + '?size=128');
    ctx.drawImage(avatar, x - r, y - r, r * 2, r * 2);
  } catch {
    ctx.fillStyle = '#111827';
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    drawTextWithShadow(ctx, '?', x, y, 'bold 40px Orbitron-Bold', '#fff', 'center');
  }
  ctx.restore();

  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();

  const username = data.username.length > 14 ? data.username.slice(0, 13) + '…' : data.username;
  drawTextWithShadow(ctx, username, x, 188, 'bold 17px Orbitron-Bold', '#ffffff', 'center', 'rgba(0,0,0,0.7)', 5);

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 202);
  ctx.lineTo(240, 202);
  ctx.stroke();
  ctx.restore();

  const badgeW = 150;
  const badgeH = 26;
  const badgeX = x - badgeW / 2;

  drawRoundedRect(
    ctx,
    badgeX,
    210,
    badgeW,
    badgeH,
    7,
    hexToRgba(data.classColor, 0.25),
    hexToRgba(data.classColor, 0.8),
    1,
  );
  drawTextWithShadow(
    ctx,
    `${data.classEmoji} ${data.className.toUpperCase()}`,
    x,
    210 + badgeH / 2,
    'bold 10px Orbitron-Bold, NotoEmoji',
    '#fff',
    'center',
  );

  drawRoundedRect(ctx, badgeX, 243, badgeW, badgeH, 7, 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)');
  drawTextWithShadow(
    ctx,
    `✦ LEVEL ${data.level} ✦`,
    x,
    243 + badgeH / 2,
    'bold 11px  Orbitron-Bold, NotoEmoji',
    data.classColor,
    'center',
  );
}

function drawBackground(ctx: SKRSContext2D, data: ProfileData) {
  const { baseW, baseH } = LAYOUT;

  const bg = ctx.createLinearGradient(0, 0, baseW, baseH);
  bg.addColorStop(0, '#0f0c29');
  bg.addColorStop(0.5, '#1b183a');
  bg.addColorStop(1, '#14142a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, baseW, baseH);

  ctx.save();
  ctx.globalAlpha = 0.04;
  const gridSize = 20;
  for (let x = 0; x < baseW; x += gridSize) ctx.fillRect(x, 0, 1, baseH);
  for (let y = 0; y < baseH; y += gridSize) ctx.fillRect(0, y, baseW, 1);
  ctx.restore();

  const glow = hexToRgba(data.classColor, 0.25);
  const orb1 = ctx.createRadialGradient(450, 130, 0, 450, 130, 180);
  orb1.addColorStop(0, glow);
  orb1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb1;
  ctx.beginPath();
  ctx.arc(450, 130, 180, 0, Math.PI * 2);
  ctx.fill();

  const orb2 = ctx.createRadialGradient(140, 150, 0, 140, 150, 120);
  orb2.addColorStop(0, hexToRgba(data.classColor, 0.12));
  orb2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = orb2;
  ctx.beginPath();
  ctx.arc(140, 150, 120, 0, Math.PI * 2);
  ctx.fill();
}

function drawCombatPanel(ctx: SKRSContext2D, data: ProfileData) {
  const p = LAYOUT.panelRight;
  drawRoundedRect(ctx, p.x, p.y, p.w, p.h, 16, COLORS.panel, COLORS.border);
  drawTextWithShadow(
    ctx,
    'COMBAT STATUS',
    315,
    38,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.5)',
    'left',
    'transparent',
    0,
  );

  let by = 52;
  drawProgressBar(ctx, 315, by, 250, 20, data.hp, data.maxHp, 'rgba(255,255,255,0.06)', '#dc2626', '#f87171', '❤️ HP');
  by += 24;
  drawProgressBar(
    ctx,
    315,
    by,
    250,
    20,
    data.stamina,
    data.maxStamina,
    'rgba(255,255,255,0.06)',
    '#d97706',
    '#fbbf24',
    '⚡ STAMINA',
  );
  by += 24;
  drawProgressBar(
    ctx,
    315,
    by,
    250,
    20,
    data.exp,
    data.expNeeded,
    'rgba(255,255,255,0.06)',
    '#2563eb',
    '#60a5fa',
    '💠 EXP',
  );

  const statsY = 130;
  const boxW = 120,
    boxH = 60,
    gapX = 10,
    gapY = 10;
  const boxes = [
    {
      label: 'ATK',
      value: data.atk.toLocaleString(),
      sub: data.bonusAtk > 0 ? `+${data.bonusAtk}` : '',
      color: '#f87171',
      x: 315,
    },
    { label: 'DEF', value: data.def.toLocaleString(), sub: '', color: '#60a5fa', x: 315 + boxW + gapX },
    { label: 'CRIT RATE', value: `${data.critRate.toFixed(1)}%`, sub: '', color: '#fbbf24', x: 315 },
    { label: 'CRIT DMG', value: `${data.critDmg.toFixed(0)}%`, sub: '', color: '#c084fc', x: 315 + boxW + gapX },
  ];

  boxes.forEach((s, i) => {
    const row = Math.floor(i / 2);
    const y = statsY + row * (boxH + gapY);
    drawRoundedRect(ctx, s.x, y, boxW, boxH, 10, 'rgba(0,0,0,0.25)', 'rgba(255,255,255,0.05)');
    drawRoundedRect(ctx, s.x, y, boxW, 3, 1.5, s.color);
    drawTextWithShadow(
      ctx,
      s.label,
      s.x + boxW / 2,
      y + 15,
      'bold 8px Orbitron-Bold',
      'rgba(255,255,255,0.45)',
      'center',
      'transparent',
      0,
    );
    drawTextWithShadow(ctx, s.value, s.x + boxW / 2, y + 38, 'bold 18px Orbitron-Bold', '#ffffff', 'center');
    if (s.sub) drawTextWithShadow(ctx, s.sub, s.x + boxW - 10, y + 15, 'bold 8px Orbitron-Bold', s.color, 'right');
  });

  drawTextWithShadow(
    ctx,
    `Items: ${data.itemCount.toLocaleString()}  •  Next: ${data.nextUnlock}`,
    440,
    270,
    '700 9px Orbitron-Bold',
    'rgba(255,255,255,0.6)',
    'center',
  );
}

function drawBottomPanel(ctx: SKRSContext2D, data: ProfileData) {
  const p = LAYOUT.panelBottom;
  drawRoundedRect(ctx, p.x, p.y, p.w, p.h, 16, COLORS.panel, COLORS.border);

  let eqY = 320;
  drawTextWithShadow(
    ctx,
    'EQUIPMENT',
    40,
    eqY,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.5)',
    'left',
    'transparent',
    0,
  );
  eqY += 15;
  data.equipment.slice(0, 5).forEach((eq, i) => {
    const y = eqY + i * 26;
    drawRoundedRect(ctx, 40, y, 240, 22, 6, 'rgba(255,255,255,0.03)', 'rgba(255,255,255,0.05)');
    drawTextWithShadow(ctx, eq.emoji, 52, y + 11, emojiFont(12), '#fff', 'left');
    drawTextWithShadow(ctx, eq.name, 84, y + 11, '500 9.5px NotoRegular', 'rgba(255,255,255,0.9)', 'left');
  });

  let skY = 475;
  drawTextWithShadow(
    ctx,
    'SKILLS',
    40,
    skY,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.5)',
    'left',
    'transparent',
    0,
  );
  skY += 15;
  data.skills.slice(0, 3).forEach((sk, i) => {
    const y = skY + i * 24;
    drawRoundedRect(ctx, 40, y, 240, 20, 6, 'rgba(0,0,0,0.2)');
    drawTextWithShadow(ctx, sk.emoji, 52, y + 10, emojiFont(11), '#fff', 'left');
    drawTextWithShadow(ctx, sk.name, 74, y + 10, '500 9px NotoRegular', 'rgba(255,255,255,0.85)', 'left');
  });

  let bfY = 320;
  drawTextWithShadow(
    ctx,
    'BUFFS',
    310,
    bfY,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.5)',
    'left',
    'transparent',
    0,
  );
  bfY += 15;
  if (data.buffs.length === 0) {
    drawTextWithShadow(
      ctx,
      'No active buffs',
      310,
      bfY + 10,
      'italic 9px NotoRegular',
      'rgba(255,255,255,0.3)',
      'left',
    );
  } else {
    let bx = 310;
    let by2 = bfY + 8;
    data.buffs.slice(0, 6).forEach((b) => {
      const tw = ctx.measureText(b).width + 14;
      if (bx + tw > 540) {
        bx = 310;
        by2 += 22;
      }
      drawRoundedRect(ctx, bx, by2 - 6, tw, 16, 4, hexToRgba(data.classColor, 0.15), hexToRgba(data.classColor, 0.5));
      drawTextWithShadow(ctx, b, bx + tw / 2, by2 + 2, '600 7.5px NotoRegular', '#fff', 'center');
      bx += tw + 6;
    });
  }

  const wy = 515;
  drawRoundedRect(ctx, 310, wy, 250, 50, 10, 'rgba(0,0,0,0.3)', hexToRgba(data.classColor, 0.4), 1);
  drawTextWithShadow(
    ctx,
    'WALLET',
    325,
    wy + 13,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.4)',
    'left',
    'transparent',
    0,
  );
  drawTextWithShadow(
    ctx,
    `💰 ${formatNumber(data.balance)}`,
    325,
    wy + 34,
    `bold 16px Orbitron-Bold, NotoEmoji`,
    '#ffffff',
    'left',
  );
  drawTextWithShadow(
    ctx,
    'BANK',
    545,
    wy + 13,
    'bold 12px Rajdhani-SemiBold',
    'rgba(255,255,255,0.4)',
    'right',
    'transparent',
    0,
  );
  drawTextWithShadow(
    ctx,
    `🏦 ${formatNumber(data.bank)}`,
    545,
    wy + 34,
    `bold 16px Orbitron-Bold, NotoEmoji`,
    '#a7f3d0',
    'right',
  );
}

export async function renderProfileCard(data: ProfileData): Promise<Buffer> {
  const { baseW, baseH } = LAYOUT;
  const canvas = createCanvas(baseW, baseH);
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  drawBackground(ctx, data);

  const left = LAYOUT.panelLeft;
  drawRoundedRect(ctx, left.x, left.y, left.w, left.h, 16, COLORS.panel, COLORS.border);
  await drawAvatar(ctx, data);

  drawCombatPanel(ctx, data);
  drawBottomPanel(ctx, data);

  ctx.save();
  ctx.shadowColor = data.classColor;
  ctx.shadowBlur = 10;
  drawRoundedRect(ctx, 10, 10, baseW - 20, baseH - 20, 20, undefined, hexToRgba(data.classColor, 0.4), 1.5);
  ctx.restore();

  return await canvas.encode('png');
}
