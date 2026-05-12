import { Schema, model, Document } from 'mongoose';

export interface FloorState {
  rooms: number;
  current: number;
  log: string[];
  gold: number;
  exp: number;
  dealt: number;
  taken: number;
  hasBattle?: boolean;
}

export interface IDungeon extends Document {
  discordId: string;
  highestFloor: number;
  currentFloor: number;
  inRun: boolean;
  lastRun: Date | null;
  floorState: FloorState | null;
}

const DungeonSchema = new Schema<IDungeon>({
  discordId: { type: String, required: true, unique: true },
  highestFloor: { type: Number, default: 0 },
  currentFloor: { type: Number, default: 1 },
  inRun: { type: Boolean, default: false },
  lastRun: { type: Date, default: null },
  floorState: { type: Schema.Types.Mixed, default: null }, // simpan state multi-room
});

export const Dungeon = model<IDungeon>('Dungeon', DungeonSchema);
