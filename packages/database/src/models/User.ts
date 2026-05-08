import { Schema, model, Document } from 'mongoose';

export interface IBuff {
  type: 'atk' | 'stamina_regen';
  value: number;
  expires: Date;
}

export interface IUser extends Document {
  discordId: string;
  username: string;
  balance: number;
  bank: number;
  lastDaily: Date | null;
  lastExplore: Date | null;
  lastFish: Date | null;
  lastHunt: Date | null;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  attack: number;
  class: 'warrior' | 'mage' | 'rogue' | null;
  stamina: number;
  maxStamina: number;
  items: { itemId: string; qty: number }[];
  buffs: IBuff[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    balance: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastExplore: { type: Date, default: null },
    lastFish: { type: Date, default: null },
    lastHunt: { type: Date, default: null },
    level: { type: Number, default: 1 },
    exp: { type: Number, default: 0 },
    hp: { type: Number, default: 100 },
    maxHp: { type: Number, default: 100 },
    attack: { type: Number, default: 10 },
    class: { type: String, enum: ['warrior', 'mage', 'rogue'], default: null },
    stamina: { type: Number, default: 100 },
    maxStamina: { type: Number, default: 100 },
    items: {
      type: [
        {
          itemId: { type: String, required: true },
          qty: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    buffs: {
      type: [
        {
          type: { type: String, enum: ['atk', 'stamina_regen'], required: true },
          value: { type: Number, required: true },
          expires: { type: Date, required: true },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', UserSchema);
