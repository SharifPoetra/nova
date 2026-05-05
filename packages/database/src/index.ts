import mongoose from 'mongoose';

// Ekspor semua model dari sini agar bisa diakses via @nova/db
export * from './models/User';

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
