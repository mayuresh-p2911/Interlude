import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContinueWatchingDocument = ContinueWatching & Document;

@Schema({ timestamps: true, collection: 'continue_watching' })
export class ContinueWatching {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
  movie: Types.ObjectId;

  @Prop({ default: 0 })
  progress: number;

  @Prop({ default: Date.now })
  lastWatchedAt: Date;
}

export const ContinueWatchingSchema = SchemaFactory.createForClass(ContinueWatching);
ContinueWatchingSchema.index({ userId: 1, movie: 1 }, { unique: true });
ContinueWatchingSchema.index({ userId: 1, lastWatchedAt: -1 });
