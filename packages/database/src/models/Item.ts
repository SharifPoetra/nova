import { Schema, model, Document } from 'mongoose';

export interface IItem extends Document {
  itemId: string;
  name: string;
  emoji: string;
  description: string;
  type: 'consumable' | 'material' | 'equipment';
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  Mythic;
  sellPrice: number;
  effect?: { stamina?: number; hp?: number };
}

const ItemSchema = new Schema<IItem>({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '📦' },
  description: { type: String, required: true },
  type: { type: String, enum: ['consumable', 'material', 'equipment'], required: true },
  rarity: {
    type: String,
    enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
    default: 'Common',
  },
  sellPrice: { type: Number, default: 10 },
  effect: {
    stamina: { type: Number },
    hp: { type: Number },
  },
});

export const Item = model<IItem>('Item', ItemSchema);
