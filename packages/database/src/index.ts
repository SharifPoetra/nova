import mongoose from 'mongoose';

export * from './models/User.js';
export * from './models/Item.js';
export * from './models/Dungeon.js';
export * from './models/Guild.js';
export * from './models/UserBackground.js';

let isConnected = false;
let listenersAttached = false;

export const createDatabase = async (connectionString: string) => {
  try {
    if (!connectionString) throw new Error('MONGODB_URI is required');

    if (isConnected) {
      console.log('🔄 MongoDB is already connected, reusing');
      return mongoose.connection;
    }

    // Setting buat mobile / koneksi tidak stabil
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

    isConnected = true;
    console.log('✅ MongoDB Connected');

    if (!listenersAttached) {
      const db = mongoose.connection;

      db.on('disconnected', () => {
        isConnected = false;
        console.log('⚠️ MongoDB disconnected - will try to reconnect automatically...');
      });

      db.on('reconnected', () => {
        isConnected = true;
        console.log('🔄 MongoDB reconnected!');
      });

      db.on('error', (err) => {
        console.error('❌ MongoDB error:', err.message);
        // jangan process.exit - biar coba reconnect
      });

      // Handle app close
      process.once('SIGINT', async () => {
        await db.close();
        console.log('MongoDB disconnected through app termination');
        process.exit(0);
      });

      listenersAttached = true;
    }

    return mongoose.connection;
  } catch (error) {
    console.error('❌ MongoDB Initial Connection Error:', error);
    // jangan process.exit - coba lagi 5 detik
    console.log('⏳ Retrying in 5 seconds...');
    await new Promise((res) => setTimeout(res, 5000));
    return createDatabase(connectionString); // recursive retry
  }
};
