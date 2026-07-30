import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WatchSessionDocument = WatchSession & Document;

class SessionParticipant {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: true })
  isActive: boolean;
}

@Schema({ timestamps: true, collection: 'watch_sessions' })
export class WatchSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  host: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
  movie: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  participants: SessionParticipant[];

  @Prop({ enum: ['waiting', 'playing', 'paused', 'ended'], default: 'waiting' })
  state: string;

  @Prop({ default: 0 })
  currentTime: number;

  @Prop({ default: 1 })
  playbackRate: number;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null })
  endedAt: Date | null;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Group', default: null })
  group: Types.ObjectId | null;
}

export const WatchSessionSchema = SchemaFactory.createForClass(WatchSession);
WatchSessionSchema.index({ host: 1 });
WatchSessionSchema.index({ state: 1 });
WatchSessionSchema.index({ createdAt: -1 });
