import { Schema, model, type Document, type Model } from 'mongoose';

export interface IUser extends Document {
  id: string;
  balance: number;
  exp: number;
  level: number;
  lastDaily: Date | null;
  rpgClass: string | null;
  hp: number;
  maxHp: number;
  attack: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    balance: { type: Number, default: 0 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null },
    rpgClass: { type: String, default: null },
    hp: { type: Number, default: 100 },
    maxHp: { type: Number, default: 100 },
    attack: { type: Number, default: 10 },
  },
  { timestamps: true },
);

export const User: Model<IUser> = model<IUser>('User', UserSchema);
