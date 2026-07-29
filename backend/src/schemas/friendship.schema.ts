import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendshipDocument = Friendship & Document;

@Schema({ timestamps: true, collection: 'friendships' })
export class Friendship {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  friend: Types.ObjectId;
}

export const FriendshipSchema = SchemaFactory.createForClass(Friendship);
FriendshipSchema.index({ user: 1, friend: 1 }, { unique: true });
FriendshipSchema.index({ user: 1 });
