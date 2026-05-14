import { Schema, model, Document } from 'mongoose';

export interface IItemEffect {
  type: 'heal' | 'stamina' | 'mana' | 'buff';
  value: number;
}

export interface IItem extends Document {
  itemId: string;
  name: string;
  emoji: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  description: string;
  effects?: IItemEffect[];
}

const ItemSchema = new Schema(
  {
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    emoji: { type: String, required: true },
    rarity: {
      type: String,
      enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
      default: 'Common',
    },
    sellPrice: { type: Number, default: 0 },
    type: { type: String, enum: ['material', 'equipment', 'consumable'], default: 'material' },
    description: { type: String, default: '' },
    effects: [
      {
        type: { type: String, enum: ['heal', 'stamina', 'mana', 'buff'], required: true },
        value: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export const Item = model<IItem>('Item', ItemSchema);
