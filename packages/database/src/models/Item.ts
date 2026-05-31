import { Schema, model, Document } from 'mongoose';

export interface IItemEffect {
  type: 'heal' | 'stamina' | 'mana' | 'buff';
  value: number;
}

export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'accessory' | 'tool';

export type Element = 'physical' | 'fire' | 'water' | 'earth' | 'wind' | 'ice' | 'lightning' | 'light' | 'dark';

export interface IEquipmentStat {
  atk?: number;
  hp?: number;
  def?: number;
  critRate?: number;
  critDmg?: number;
  element?: Element;
  grantsSkill?: string;
  classLock?: ('warrior' | 'mage' | 'rogue')[];
  fishBonus?: number;
  mineBonus?: number;
  gatherBonus?: number;
}

export interface IItem extends Document {
  itemId: string;
  emoji: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  sellPrice: number;
  type: 'material' | 'equipment' | 'consumable';
  effects?: IItemEffect[];
  slot?: EquipmentSlot;
  stats?: IEquipmentStat;
}

const ItemSchema = new Schema<IItem>(
  {
    itemId: { type: String, required: true, unique: true },
    emoji: { type: String, required: true },
    rarity: {
      type: String,
      enum: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'],
      default: 'Common',
    },
    sellPrice: { type: Number, default: 0 },
    type: { type: String, enum: ['material', 'equipment', 'consumable'], default: 'material' },
    effects: [
      {
        type: { type: String, enum: ['heal', 'stamina', 'mana', 'buff'], required: true },
        value: { type: Number, required: true },
      },
    ],
    slot: {
      type: String,
      enum: ['weapon', 'helmet', 'armor', 'accessory', 'tool'],
      required: function () {
        return this.type === 'equipment';
      },
    },
    stats: {
      type: {
        atk: Number,
        hp: Number,
        def: Number,
        critRate: Number,
        critDmg: Number,
        element: {
          type: String,
          enum: ['physical', 'fire', 'water', 'earth', 'wind', 'ice', 'lightning', 'light', 'dark'],
        },
        grantsSkill: String,
        classLock: [{ type: String, enum: ['warrior', 'mage', 'rogue'] }],
        fishBonus: Number,
        mineBonus: Number,
        gatherBonus: Number,
      },
      required: false,
    },
  },
  { timestamps: true },
);

export const Item = model<IItem>('Item', ItemSchema);
