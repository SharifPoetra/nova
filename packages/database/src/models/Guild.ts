import { Schema, model, Document } from 'mongoose';

export interface IGuild extends Document {
  guildId: string;
  lang: string;
}

const GuildSchema = new Schema<IGuild>({
  guildId: { type: String, required: true, unique: true },
  lang: { type: String, default: 'id' },
});

export const Guild = model<IGuild>('Guild', GuildSchema);
