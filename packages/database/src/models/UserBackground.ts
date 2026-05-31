import { Schema, model, Document } from 'mongoose';

export interface IUserBackground extends Document {
  discordId: string;
  backgroundId: string;
  purchasedAt: Date;
  isActive: boolean;
  favorited?: boolean;
  customName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserBackgroundSchema = new Schema<IUserBackground>(
  {
    discordId: {
      type: String,
      required: true,
      index: true,
      ref: 'User', // Reference ke User model via discordId
    },
    backgroundId: {
      type: String,
      required: true,
      index: true,
    },
    purchasedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    favorited: {
      type: Boolean,
      default: false,
    },
    customName: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true },
);

// Compound indexes untuk optimasi query
UserBackgroundSchema.index({ discordId: 1, isActive: 1 });
UserBackgroundSchema.index({ discordId: 1, backgroundId: 1 }, { unique: true });
UserBackgroundSchema.index({ discordId: 1, favorited: 1 });
UserBackgroundSchema.index({ discordId: 1, purchasedAt: -1 });

export const UserBackground = model<IUserBackground>('UserBackground', UserBackgroundSchema);
