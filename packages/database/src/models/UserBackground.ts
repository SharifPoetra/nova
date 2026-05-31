import { Schema, model, Document, Types } from 'mongoose';

export interface IUserBackground extends Document {
  userId: Types.ObjectId;
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
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
UserBackgroundSchema.index({ userId: 1, isActive: 1 });
UserBackgroundSchema.index({ userId: 1, backgroundId: 1 }, { unique: true });
UserBackgroundSchema.index({ userId: 1, favorited: 1 });
UserBackgroundSchema.index({ userId: 1, purchasedAt: -1 });

export const UserBackground = model<IUserBackground>('UserBackground', UserBackgroundSchema);
