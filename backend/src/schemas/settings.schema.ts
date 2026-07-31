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
      showFriendList: true,
      showActivity: true,
      showLastActive: true,
      allowFriendRequests: true,
    },
  })
  privacy: {
    showFriendList: boolean;
    showActivity: boolean;
    showLastActive: boolean;
    allowFriendRequests: boolean;
  };

  @Prop({
    type: Object,
    default: {
      filterMessages: 'none_to_spam',
      blockedWords: [],
      readReceipts: true,
      showEmojiReactions: true,
      allowLinksFromNonFriends: true,
      allowDmsFrom: 'all',
    },
  })
  messaging: {
    filterMessages: 'all_to_spam' | 'non_friends_to_spam' | 'none_to_spam';
    blockedWords: string[];
    readReceipts: boolean;
    showEmojiReactions: boolean;
    allowLinksFromNonFriends: boolean;
    allowDmsFrom: 'none' | 'friends_only' | 'friends_user_added' | 'all';
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
