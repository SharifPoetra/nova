import { Schema, model, Document } from 'mongoose';

export interface IUserBackground extends Document {
  discordId: string;
  backgroundId: string;
  purchasedAt: Date;
  isActive: boolean;
  favorited: boolean;
  customName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserBackgroundSchema = new Schema<IUserBackground>(
  {
    discordId: {
      type: String,
      required: true,
    },
    backgroundId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    purchasedAt: {
      type: Date,
      default: () => new Date(),
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    favorited: {
      type: Boolean,
      default: false,
    },
    customName: {
      type: String,
    },
  },
  { timestamps: true },
);

// Compound indexes untuk optimasi query
UserBackgroundSchema.index(
  { discordId: 1, isActive: 1 },
  { unique: true, partialFilterExpression: { isActive: true } },
);
UserBackgroundSchema.index({ discordId: 1, backgroundId: 1 }, { unique: true });
UserBackgroundSchema.index({ discordId: 1, favorited: 1 }, { partialFilterExpression: { favorited: true } });
UserBackgroundSchema.index({ discordId: 1, purchasedAt: -1 });

export const UserBackground = model<IUserBackground>('UserBackground', UserBackgroundSchema);
