import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Movie, MovieDocument } from '../schemas/movie.schema';
import { WatchSession, WatchSessionDocument } from '../schemas/watch-session.schema';
import { Group, GroupDocument } from '../schemas/group.schema';
import { Message, MessageDocument } from '../schemas/message.schema';
import { ProviderFactory } from '../movies/providers/provider.factory';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(WatchSession.name) private sessionModel: Model<WatchSessionDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private providerFactory: ProviderFactory,
  ) {}

  async getDashboardStats() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsers,
      totalMovies,
      activeSessions,
      totalGroups,
      messagesLastDay,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ onlineStatus: { $ne: 'offline' } }),
      this.movieModel.countDocuments({ isActive: true }),
      this.sessionModel.countDocuments({ state: { $in: ['playing', 'paused', 'waiting'] } }),
      this.groupModel.countDocuments(),
      this.messageModel.countDocuments({ createdAt: { $gte: yesterday } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalMovies,
      activeSessions,
      totalGroups,
      messagesLastDay,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const query = search
      ? { $or: [{ username: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] }
      : {};

    const [data, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -refreshToken -emailVerificationToken -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(query),
    ]);

    return { data, total, page, limit, hasMore: skip + limit < total };
  }

  async updateUser(userId: string, updates: { isAdmin?: boolean; isBlocked?: boolean }) {
    return this.userModel.findByIdAndUpdate(userId, updates, { new: true })
      .select('-password -refreshToken');
  }

  async getMovies(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.movieModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.movieModel.countDocuments(),
    ]);
    return { data, total, page, limit, hasMore: skip + limit < total };
  }

  async toggleMovieStatus(movieId: string) {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new Error('Movie not found');
    return this.movieModel.findByIdAndUpdate(
      movieId,
      { isActive: !movie.isActive },
      { new: true },
    );
  }

  getStreamingConfig() {
    return {
      currentProvider: process.env.STREAMING_PROVIDER ?? 'internet_archive',
      availableProviders: this.providerFactory.getAvailableProviders(),
    };
  }
}
