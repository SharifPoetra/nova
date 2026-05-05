import { Schema, model, type Document } from 'mongoose';

// Interface untuk membantu TypeScript mengenali properti user
export interface IUser extends Document {
  id: string;
  balance: number;
  exp: number;
  level: number;
  lastDaily: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    id: { type: String, required: true, unique: true },
    balance: { type: Number, default: 1000 },
    exp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    lastDaily: { type: Date, default: null },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', UserSchema);
