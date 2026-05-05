import { createCanvas, loadImage } from '@napi-rs/canvas';

export async function generateProfileCard(
  username: string,
  avatarUrl: string,
  level: number,
  rpgClass: string,
) {
  const canvas = createCanvas(600, 200);
  const ctx = canvas.getContext('2d');

  // 1. Background
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, 600, 200);

  // 2. Avatar
  const avatar = await loadImage(avatarUrl);
  ctx.save();
  ctx.beginPath();
  ctx.arc(100, 100, 70, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 30, 30, 140, 140);
  ctx.restore();

  // 3. Teks Nama (Gunakan 'sans-serif' saja dulu)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 35px sans-serif'; // Ukuran diperbesar
  ctx.fillText(username, 200, 65);

  // 4. Info Class
  ctx.fillStyle = '#fab387';
  ctx.font = '25px sans-serif';
  ctx.fillText(`${rpgClass}`, 200, 105);

  // 5. Info Level (Di atas Bar)
  ctx.fillStyle = '#9399b2';
  ctx.font = '20px sans-serif';
  ctx.fillText(`Level ${level}`, 200, 145);

  // 6. Progress Bar HP/EXP
  // Background bar
  ctx.fillStyle = '#45475a';
  ctx.roundRect(200, 155, 350, 25, 5); // Pakai roundRect biar estetik
  ctx.fill();

  // Isi bar
  ctx.fillStyle = '#a6e3a1';
  ctx.roundRect(200, 155, 250, 25, 5); // Angka 250 ini nanti bisa dinamis
  ctx.fill();

  return canvas.toBuffer('image/png');
}
