import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true, collection: 'messages' })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  // For DMs
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  recipient: Types.ObjectId | null;

  // For group messages
  @Prop({ type: Types.ObjectId, ref: 'Group', default: null })
  group: Types.ObjectId | null;

  // Conversation ID (sender+recipient sorted and joined)
  @Prop({ default: null, index: true })
  conversationId: string | null;

  @Prop({ required: true, maxlength: 4000 })
  content: string;

  @Prop({ enum: ['text', 'image', 'movie_share', 'system'], default: 'text' })
  type: string;

  @Prop({ default: null })
  imageUrl: string | null;

  @Prop({ type: Object, default: null })
  movieRef: {
    movieId: string;
    title: string;
    poster?: string;
  } | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ group: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
