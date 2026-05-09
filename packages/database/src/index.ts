import mongoose from 'mongoose';

// Ekspor semua model dari sini agar bisa diakses via @nova/db
export { User } from './models/User.js';
export { Item } from './models/Item.js';
export type { IUser } from './models/User.js';
export type { IItem } from './models/Item.js';

export const createDatabase = async (connectionString: string) => {
  try {
    const conn = await mongoose.connect(connectionString);
    console.log('✅ MongoDB Connected Successfully');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1); // Matikan proses jika DB gagal konek
  }
};
