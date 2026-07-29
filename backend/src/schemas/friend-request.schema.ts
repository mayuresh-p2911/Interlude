import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FriendRequestDocument = FriendRequest & Document;

@Schema({ timestamps: true, collection: 'friend_requests' })
export class FriendRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiver: Types.ObjectId;

  @Prop({ enum: ['pending', 'accepted', 'declined', 'cancelled'], default: 'pending' })
  status: string;
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);
FriendRequestSchema.index({ sender: 1, receiver: 1 }, { unique: true });
FriendRequestSchema.index({ receiver: 1, status: 1 });
