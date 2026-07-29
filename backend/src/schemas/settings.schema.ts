import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SettingsDocument = Settings & Document;

@Schema({ timestamps: true, collection: 'settings' })
export class Settings {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    type: Object,
    default: {
      friendRequests: true,
      groupInvites: true,
      watchInvites: true,
      messages: true,
      friendOnline: false,
    },
  })
  notifications: {
    friendRequests: boolean;
    groupInvites: boolean;
    watchInvites: boolean;
    messages: boolean;
    friendOnline: boolean;
  };

  @Prop({
    type: Object,
    default: {
      showOnlineStatus: true,
      showActivity: true,
      allowFriendRequests: true,
    },
  })
  privacy: {
    showOnlineStatus: boolean;
    showActivity: boolean;
    allowFriendRequests: boolean;
  };

  @Prop({
    type: Object,
    default: {
      defaultQuality: 'auto',
      autoplay: true,
      defaultSubtitles: '',
    },
  })
  playback: {
    defaultQuality: string;
    autoplay: boolean;
    defaultSubtitles: string;
  };
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
