import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';
import { WatchHistory, WatchHistoryDocument } from '../schemas/watch-history.schema';
import { Watchlist, WatchlistDocument } from '../schemas/watchlist.schema';
import { ContinueWatching, ContinueWatchingDocument } from '../schemas/continue-watching.schema';
import { Settings, SettingsDocument } from '../schemas/settings.schema';
import { UploadService } from '../common/upload.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(WatchHistory.name) private watchHistoryModel: Model<WatchHistoryDocument>,
    @InjectModel(Watchlist.name) private watchlistModel: Model<WatchlistDocument>,
    @InjectModel(ContinueWatching.name) private continueWatchingModel: Model<ContinueWatchingDocument>,
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
    private uploadService: UploadService,
  ) {}

  async findByUsername(username: string, requestingUserId?: string) {
    const user = await this.userModel.findOne({ username, isBlocked: false });
    if (!user) throw new NotFoundException('User not found');

    const targetSettings = await this.settingsModel.findOne({ userId: user._id });
    let requestingSettings = null;
    if (requestingUserId) {
      requestingSettings = await this.settingsModel.findOne({
        userId: new Types.ObjectId(requestingUserId),
      });
    }

    // Check privacy settings
    const targetShowLastActive = targetSettings?.privacy?.showLastActive ?? true;
    const requestingShowLastActive = requestingSettings?.privacy?.showLastActive ?? true;
    // NOTE: IF USER DISABLES SHOW LAST ACTIVE, HE WON'T SEE ANYONE'S LAST ACTIVE
    const canSeeLastActive = targetShowLastActive && requestingShowLastActive;

    const showActivity = targetSettings?.privacy?.showActivity ?? true;
    const showFriendList = targetSettings?.privacy?.showFriendList ?? true;

    // Check if custom status has expired (24 hours)
    let activeCustomStatus = null;
    if (user.customStatus && user.customStatus.expiresAt > new Date()) {
      activeCustomStatus = user.customStatus.text;
    }

    // Friends count
    let friendsCount = 0;
    if (showFriendList) {
      friendsCount = await this.friendshipModel.countDocuments({ user: user._id });
    }

    const publicProfile = {
      _id: user._id,
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      pronouns: user.pronouns || '',
      customStatus: activeCustomStatus,
      onlineStatus: user.onlineStatus,
      lastSeen: canSeeLastActive ? user.lastSeen : null,
      currentActivity: showActivity ? user.currentActivity : null,
      friendsCount: showFriendList ? friendsCount : null,
      joinedAt: (user as any).createdAt,
    };

    return publicProfile;
  }

  async searchUsers(query: string, requestingUserId: string, limit = 20) {
    const users = await this.userModel
      .find({
        $text: { $search: query },
        _id: { $ne: new Types.ObjectId(requestingUserId) },
        isBlocked: false,
      })
      .select('username avatar bio onlineStatus')
      .limit(limit)
      .lean();

    return users;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const updateData: Partial<User> = {};

    if (dto.username !== undefined) {
      const existing = await this.userModel.findOne({
        username: dto.username,
        _id: { $ne: new Types.ObjectId(userId) },
      });
      if (existing) throw new ConflictException('Username already taken');
      updateData.username = dto.username;
    }

    if (dto.bio !== undefined) {
      updateData.bio = dto.bio;
    }

    if (dto.pronouns !== undefined) {
      updateData.pronouns = dto.pronouns;
    }

    if (dto.customStatusText !== undefined) {
      if (dto.customStatusText.trim() === '') {
        updateData.customStatus = null;
      } else {
        updateData.customStatus = {
          text: dto.customStatusText.trim(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Lasts 24 hours
        };
      }
    }

    const updated = await this.userModel.findByIdAndUpdate(userId, updateData, { new: true });
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async uploadAvatar(userId: string, buffer: Buffer) {
    const avatarUrl = await this.uploadService.uploadAvatar(buffer, userId);
    const updated = await this.userModel.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true },
    );
    return { avatar: avatarUrl };
  }

  async updateOnlineStatus(userId: string, status: 'online' | 'away' | 'offline') {
    await this.userModel.findByIdAndUpdate(userId, {
      onlineStatus: status,
      ...(status === 'offline' ? { lastSeen: new Date(), currentActivity: null } : {}),
    });
  }

  async updateActivity(
    userId: string,
    activity: { type: string; movieId?: string; movieTitle?: string; sessionId?: string } | null,
  ) {
    await this.userModel.findByIdAndUpdate(userId, { currentActivity: activity });
  }

  async getUserFriends(userId: string) {
    const friendships = await this.friendshipModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('friend', 'username avatar onlineStatus currentActivity')
      .lean();

    return friendships.map((f) => f.friend);
  }

  async getWatchHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.watchHistoryModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('movie', 'title poster')
        .sort({ watchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.watchHistoryModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { data, total, page, limit, hasMore: skip + limit < total };
  }

  async getWatchlist(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.watchlistModel
        .find({ userId: new Types.ObjectId(userId) })
        .populate('movie', 'title poster year genres')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.watchlistModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { data, total, page, limit, hasMore: skip + limit < total };
  }

  async addToWatchlist(userId: string, movieId: string) {
    try {
      await this.watchlistModel.create({
        userId: new Types.ObjectId(userId),
        movie: new Types.ObjectId(movieId),
      });
      return { message: 'Added to watchlist' };
    } catch {
      throw new ConflictException('Movie already in watchlist');
    }
  }

  async removeFromWatchlist(userId: string, movieId: string) {
    await this.watchlistModel.deleteOne({
      userId: new Types.ObjectId(userId),
      movie: new Types.ObjectId(movieId),
    });
    return { message: 'Removed from watchlist' };
  }

  async getContinueWatching(userId: string) {
    return this.continueWatchingModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('movie', 'title poster runtime')
      .sort({ lastWatchedAt: -1 })
      .limit(10)
      .lean();
  }

  async updateProgress(userId: string, movieId: string, progress: number) {
    await this.continueWatchingModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), movie: new Types.ObjectId(movieId) },
      { progress, lastWatchedAt: new Date() },
      { upsert: true, new: true },
    );
  }

  async findById(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getSettings(userId: string) {
    const settings = await this.settingsModel.findOne({ userId: new Types.ObjectId(userId) });
    if (!settings) {
      return this.settingsModel.create({ userId: new Types.ObjectId(userId) });
    }
    return settings;
  }

  async updateSettings(userId: string, updates: Partial<SettingsDocument>) {
    return this.settingsModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: updates },
      { new: true, upsert: true },
    );
  }
}
