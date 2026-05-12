import { Schema, model, Document } from 'mongoose';

export interface IItem extends Document {
  itemId: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  description: string;
  effect?: 'heal' | 'stamina' | 'mana' | 'buff' | null;
  effectValue?: number;
}

const ItemSchema = new Schema<IItem>(
  {
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    rarity: {
      type: String,
      enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
      default: 'Common',
    },
    sellPrice: { type: Number, default: 0 },
    type: { type: String, enum: ['material', 'equipment', 'consumable'], default: 'material' },
    description: { type: String, default: '' },
    effect: { type: String, enum: ['heal', 'stamina', 'mana', 'buff'], default: null },
    effectValue: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Item = model<IItem>('Item', ItemSchema);
