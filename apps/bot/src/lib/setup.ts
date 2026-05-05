import '@sapphire/plugin-logger/register';
import '@sapphire/decorators/register';

import { container } from '@sapphire/framework';
import { createDatabase, UserModel } from '@nova/db';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const url = process.env.DATABASE_URL;
console.log('--- SETUP DB ---');
console.log('URL available:', !!url);
if (url) console.log('URL start:', url.substring(0, 15));
console.log('----------------');

if (!url) {
  throw new Error('DATABASE_URL is missing!');
}

createDatabase(url)
  .then(() => {
    console.log('✅ Database connected');
    // Pasang db ke container setelah berhasil konek
    container.db = {
      user: UserModel,
    };
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1); // Matikan bot jika DB gagal
  });
