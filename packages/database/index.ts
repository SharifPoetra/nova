import mongoose from 'mongoose';

export const createDatabase = async (connectionString: string) => {
    try {
        await mongoose.connect(connectionString);
        console.log('✅ MongoDB Connected Successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error);
        throw error;
    }
};

// Skema User Todo: pindahin ke file lain biar rapi
const UserSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Discord ID
    balance: { type: Number, default: 1000 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null }
}, { timestamps: true });

export const UserModel = mongoose.model('User', UserSchema);
