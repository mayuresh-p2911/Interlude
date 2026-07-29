import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WatchlistDocument = Watchlist & Document;

@Schema({ timestamps: true, collection: 'watchlists' })
export class Watchlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
  movie: Types.ObjectId;
}

export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);
WatchlistSchema.index({ userId: 1, movie: 1 }, { unique: true });
WatchlistSchema.index({ userId: 1, createdAt: -1 });
