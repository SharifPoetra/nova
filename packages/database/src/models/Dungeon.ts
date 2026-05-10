import { Schema, model, Document } from 'mongoose';

export interface IDungeon extends Document {
  discordId: string;
  highestFloor: number;
  currentFloor: number;
  inRun: boolean;
  lastRun: Date | null;
}

const DungeonSchema = new Schema<IDungeon>({
  discordId: { type: String, required: true, unique: true },
  highestFloor: { type: Number, default: 0 },
  currentFloor: { type: Number, default: 1 },
  inRun: { type: Boolean, default: false },
  lastRun: { type: Date, default: null },
});

export const Dungeon = model<IDungeon>('Dungeon', DungeonSchema);
