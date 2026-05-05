import { container } from '@sapphire/framework';
import { createDatabase } from '@nova/db';
import dotenv from "dotenv";
import path from "path";


dotenv.config({ path: path.join(process.cwd(), '../../.env') });

const url = process.env.DATABASE_URL;
console.log('--- SETUP DB ---');
console.log('URL available:', !!url);
if (url) console.log('URL start:', url.substring(0, 15));
console.log('----------------');

if (!url) {
    throw new Error('DATABASE_URL is missing in setup!');
}

// Pasang db ke container di sini
container.db = createDatabase(url);
