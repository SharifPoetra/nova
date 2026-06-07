import mongoose from 'mongoose';

export * from './models/User.js';
export * from './models/Item.js';
export * from './models/Dungeon.js';
export * from './models/Guild.js';
export * from './models/UserBackground.js';

let listenersAttached = false;

export const createDatabase = async (connectionString?: string) => {
  if (!connectionString) throw new Error('MONGODB_URI is required');

  if (mongoose.connection.readyState === 1) {
    console.log('🔄 MongoDB already connected');
    return mongoose.connection;
  }

  while (true) {
    try {
      await mongoose.connect(connectionString, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 15000,
        connectTimeoutMS: 10000,
        maxPoolSize: 5,
        minPoolSize: 1,
        retryWrites: true,
        retryReads: true,
        heartbeatFrequencyMS: 5000,
        family: 4,
      });

      console.log('✅ MongoDB Connected');
      break;
    } catch (err: any) {
      console.error('❌ MongoDB connect failed:', err.message);
      console.log('⏳ Retrying in 5s...');
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  if (!listenersAttached) {
    const db = mongoose.connection;

    db.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    db.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });
    db.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });

    const shutdown = async (signal: string) => {
      await db.close();
      console.log(`MongoDB closed via ${signal}`);
      process.exit(0);
    };
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));

    listenersAttached = true;
  }

  return mongoose.connection;
};
