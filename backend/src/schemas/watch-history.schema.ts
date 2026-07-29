import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WatchHistoryDocument = WatchHistory & Document;

@Schema({ timestamps: true, collection: 'watch_history' })
export class WatchHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
  movie: Types.ObjectId;

  @Prop({ default: 0 })
  duration: number;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: Date.now })
  watchedAt: Date;
}

export const WatchHistorySchema = SchemaFactory.createForClass(WatchHistory);
WatchHistorySchema.index({ userId: 1, watchedAt: -1 });
