import { Schema, model, Document } from 'mongoose';

export interface IItem extends Document {
  itemId: string; // 'potion_stamina'
  name: string;
  emoji: string;
  description: string;
  type: 'consumable' | 'material' | 'equipment';
  sellPrice: number;
  effect?: { stamina?: number; hp?: number }; // untuk consumable
}

const ItemSchema = new Schema<IItem>({
  itemId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '📦' },
  description: { type: String, required: true },
  type: { type: String, enum: ['consumable', 'material', 'equipment'], required: true },
  sellPrice: { type: Number, default: 10 },
  effect: {
    stamina: { type: Number },
    hp: { type: Number },
  },
});

export const Item = model<IItem>('Item', ItemSchema);
