import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipient: Types.ObjectId;

  @Prop({
    enum: [
      'friend_request',
      'friend_accepted',
      'group_invite',
      'watch_invite',
      'message',
      'friend_online',
      'watch_started',
      'system',
    ],
    required: true,
  })
  type: string;

  @Prop({ required: true, maxlength: 100 })
  title: string;

  @Prop({ required: true, maxlength: 300 })
  body: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ type: Object, default: null })
  data: Record<string, unknown> | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
