import { Schema, model, Document } from 'mongoose';

export const BUFF_TYPES = ['atk', 'stamina_regen'] as const;
export type BuffType = (typeof BUFF_TYPES)[number] | (string & {});

export interface IBuff {
  type: BuffType;
  value: number;
  expires: Date;
}

export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'accessory';

export interface IEquipped {
  weapon: string | null;
  helmet: string | null;
  armor: string | null;
  accessory: string | null;
}

export interface IUser extends Document {
  discordId: string;
  username: string;
  lang?: string | null;
  balance: number;
  bank: number;
  lastDaily: Date | null;
  lastExplore: Date | null;
  lastFish: Date | null;
  lastHunt: Date | null;
  lastPassive: Date | null;
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
  equipped: IEquipped;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true },
    lang: { type: String, default: null },
    balance: { type: Number, default: 1000 },
    bank: { type: Number, default: 0 },
    lastDaily: { type: Date, default: null },
    lastExplore: { type: Date, default: null },
    lastFish: { type: Date, default: null },
    lastHunt: { type: Date, default: null },
    lastPassive: { type: Date, default: null },
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
          type: { type: String, enum: BUFF_TYPES, required: true },
          value: { type: Number, required: true },
          expires: { type: Date, required: true },
        },
      ],
      default: [],
    },
    equipped: {
      type: {
        weapon: { type: String, default: null },
        helmet: { type: String, default: null },
        armor: { type: String, default: null },
        accessory: { type: String, default: null },
      },
      default: { weapon: null, helmet: null, armor: null, accessory: null },
    },
  },
  { timestamps: true },
);

export const User = model<IUser>('User', UserSchema);
