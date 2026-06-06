import dotenv from 'dotenv';
import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createDatabase } from '@nova/db';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const app = Fastify({ logger: { level: 'info' }, disableRequestLogging: true });

  await app.register(cors, { origin: true });

  await createDatabase(process.env.MONGODB_URI!);
  app.log.info('✅ MongoDB connected');

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

  const port = Number(process.env.API_PORT || 3001);

  try {
    await app.listen({ port, host: '127.0.0.1' });
    app.log.info(`🚀 Nova API listening on http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
