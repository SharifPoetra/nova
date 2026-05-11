import mongoose from 'mongoose';

export { User } from './models/User.js';
export { Item } from './models/Item.js';
export { Dungeon } from './models/Dungeon.js';
export type { IUser } from './models/User.js';
export type { IItem } from './models/Item.js';
export type { IDungeon } from './models/Dungeon.js';

export const createDatabase = async (connectionString: string) => {
  try {
    // Setting buat mobile / koneksi tidak stabil
    const conn = await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000, // coba 5 detik, jangan 30 detik
      socketTimeoutMS: 15000, // tutup socket kalau 15s gak respon
      connectTimeoutMS: 10000, // timeout konek awal 10s
      maxPoolSize: 5, // hemat RAM
      minPoolSize: 1,
      retryWrites: true,
      retryReads: true,
    });

    const db = mongoose.connection;

    db.on('connected', () => {
      console.log('✅ MongoDB Connected');
    });

    db.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected - akan coba reconnect otomatis...');
    });

    db.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected!');
    });

    db.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
      // jangan process.exit di sini - biar coba reconnect
    });

    // Handle app close
    process.on('SIGINT', async () => {
      await db.close();
      console.log('MongoDB disconnected through app termination');
      process.exit(0);
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB Initial Connection Error:', error);
    // jangan langsung exit - coba lagi 5 detik
    console.log('⏳ Retry dalam 5 detik...');
    await new Promise((res) => setTimeout(res, 5000));
    return createDatabase(connectionString); // recursive retry
  }
};
