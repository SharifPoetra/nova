import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
config({ path: path.resolve(__dirname, '../../../.env') });

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createDatabase } from '@nova/db';

const app = Fastify({ logger: { level: 'info' }, disableRequestLogging: true });

await app.register(cors, { origin: true });

await createDatabase(process.env.MONGODB_URI);

app.get('/', async () => ({
  name: 'Nova API',
  version: '1.0.0',
  status: 'online',
  docs: 'https://github.com/SharifPoetra/nova',
  endpoints: {
    health: '/health',
  },
}));

// health
app.get('/health', async () => ({
  ok: true,
  service: 'nova-api',
  uptime: process.uptime(),
}));

// routes - coming soon...
// await app.register(userRoutes, { prefix: '/api' });

const host = process.env.API_ADDR || '127.0.0.1';
const port = Number(process.env.API_PORT || 3001);

try {
  const address = await app.listen({ port, host });
  app.log.info(`🚀 Nova API listening on ${address}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
