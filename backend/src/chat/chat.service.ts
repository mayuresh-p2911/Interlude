import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import { Settings, SettingsDocument } from '../schemas/settings.schema';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';
import { UploadService } from '../common/upload.service';
import sanitizeHtml from 'sanitize-html';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    private uploadService: UploadService,
  ) {}

  // ── DMs ───────────────────────────────────────────────────
  async getConversations(userId: string) {
    const messages = await this.messageModel
      .aggregate([
        {
          $match: {
            $or: [
              { sender: new Types.ObjectId(userId) },
              { recipient: new Types.ObjectId(userId) },
            ],
            group: null,
            isDeleted: false,
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: '$conversationId',
            lastMessage: { $first: '$$ROOT' },
          },
        },
        { $sort: { 'lastMessage.createdAt': -1 } },
        { $limit: 50 },
      ])
      .exec();

    const conversationIds = messages.map((m: { _id: string }) => m._id);
    const populated = await this.messageModel
      .find({ conversationId: { $in: conversationIds }, group: null })
      .sort({ createdAt: -1 })
      .populate('sender', 'username avatar onlineStatus')
      .populate('recipient', 'username avatar onlineStatus')
      .lean();

    // Group by conversationId and return last message per conversation
    const convMap = new Map<string, typeof populated[0]>();
    populated.forEach((msg) => {
      if (msg.conversationId && !convMap.has(msg.conversationId)) {
        convMap.set(msg.conversationId, msg);
      }
    });

    return Array.from(convMap.values());
  }

  async getDirectMessages(userId: string, otherUserId: string, page = 1, limit = 50) {
    const conversationId = this.buildConversationId(userId, otherUserId);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.messageModel
        .find({ conversationId, isDeleted: false })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({ conversationId, isDeleted: false }),
    ]);

    return { data: data.reverse(), total, page, limit, hasMore: skip + limit < total };
  }

  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
    type: 'text' | 'image' | 'movie_share' = 'text',
    extra?: { imageUrl?: string; movieRef?: { movieId: string; title: string; poster?: string } },
  ) {
    // Check recipient settings
    const recipientSettings = await this.settingsModel.findOne({
      userId: new Types.ObjectId(recipientId),
    });

    const isFriend = await this.friendshipModel.exists({
      user: new Types.ObjectId(senderId),
      friend: new Types.ObjectId(recipientId),
    });

    const allowDmsFrom = recipientSettings?.messaging?.allowDmsFrom ?? 'all';
    if (allowDmsFrom === 'none') {
      throw new ForbiddenException('Recipient does not accept direct messages');
    }
    if ((allowDmsFrom === 'friends_only' || allowDmsFrom === 'friends_user_added') && !isFriend) {
      throw new ForbiddenException('Recipient only accepts direct messages from friends');
    }

    let processedContent = type === 'text' ? this.sanitizeContent(content) : content;

    // Filter blocked words if specified by recipient
    const blockedWords = recipientSettings?.messaging?.blockedWords ?? [];
    if (blockedWords.length > 0 && typeof processedContent === 'string') {
      blockedWords.forEach((word) => {
        if (word) {
          const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
          processedContent = processedContent.replace(regex, '*'.repeat(word.length));
        }
      });
    }

    // Filter links from non-friends if disabled
    const allowLinks = recipientSettings?.messaging?.allowLinksFromNonFriends ?? true;
    if (!allowLinks && !isFriend && typeof processedContent === 'string') {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      processedContent = processedContent.replace(urlRegex, '[Link Disabled]');
    }

    const conversationId = this.buildConversationId(senderId, recipientId);

    const message = await this.messageModel.create({
      sender: new Types.ObjectId(senderId),
      recipient: new Types.ObjectId(recipientId),
      conversationId,
      content: processedContent,
      type,
      imageUrl: extra?.imageUrl ?? null,
      movieRef: extra?.movieRef ?? null,
      readBy: [new Types.ObjectId(senderId)],
    });

    return message.populate('sender', 'username avatar');
  }

  async markMessagesRead(conversationId: string, userId: string) {
    await this.messageModel.updateMany(
      { conversationId, readBy: { $ne: new Types.ObjectId(userId) } },
      { $addToSet: { readBy: new Types.ObjectId(userId) } },
    );
  }

  // ── Group Chat ────────────────────────────────────────────
  async getGroupMessages(groupId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.messageModel
        .find({ group: new Types.ObjectId(groupId), isDeleted: false })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.messageModel.countDocuments({ group: new Types.ObjectId(groupId), isDeleted: false }),
    ]);

    return { data: data.reverse(), total, page, limit, hasMore: skip + limit < total };
  }

  async sendGroupMessage(
    senderId: string,
    groupId: string,
    content: string,
    type: 'text' | 'image' | 'movie_share' = 'text',
    extra?: { imageUrl?: string; movieRef?: { movieId: string; title: string; poster?: string } },
  ) {
    const sanitized = type === 'text' ? this.sanitizeContent(content) : content;

    const message = await this.messageModel.create({
      sender: new Types.ObjectId(senderId),
      group: new Types.ObjectId(groupId),
      content: sanitized,
      type,
      imageUrl: extra?.imageUrl ?? null,
      movieRef: extra?.movieRef ?? null,
      readBy: [new Types.ObjectId(senderId)],
    });

    return message.populate('sender', 'username avatar');
  }

  async uploadMessageImage(senderId: string, recipientId: string, buffer: Buffer): Promise<string> {
    const messageId = uuidv4();
    return this.uploadService.uploadMessageImage(buffer, messageId);
  }

  // ── Helpers ───────────────────────────────────────────────
  private buildConversationId(userId1: string, userId2: string): string {
    return [userId1, userId2].sort().join('_');
  }

  private sanitizeContent(content: string): string {
    return sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
  }
}
