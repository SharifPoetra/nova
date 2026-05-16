import { Schema, model, Document } from 'mongoose';

export interface IItemEffect {
  type: 'heal' | 'stamina' | 'mana' | 'buff';
  value: number;
}

export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'accessory';
export type Element = 'phys' | 'fire' | 'ice' | 'light' | 'dark';

export interface IEquipmentStat {
  atk?: number;
  hp?: number;
  def?: number;
  critRate?: number; // 0.05 = 5%
  critDmg?: number; // 2.0 = 200%
  element?: Element;
  grantsSkill?: string;
  classLock?: ('warrior' | 'mage' | 'rogue')[];
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
  slot?: EquipmentSlot;
  stats?: IEquipmentStat;
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
    slot: {
      type: String,
      enum: ['weapon', 'helmet', 'armor', 'accessory'],
      required: function() { return this.type === 'equipment'; },
    },
    stats: {
      type: {
        atk: Number,
        hp: Number,
        def: Number,
        critRate: Number,
        critDmg: Number,
        element: { type: String, enum: ['phys', 'fire', 'ice', 'light', 'dark'] },
        grantsSkill: String,
        classLock: [{ type: String, enum: ['warrior', 'mage', 'rogue'] }],
      },
      required: false,
    },
  },
  { timestamps: true },
);

export const Item = model<IItem>('Item', ItemSchema);
