import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WatchSession, WatchSessionDocument } from '../schemas/watch-session.schema';
import { Movie, MovieDocument } from '../schemas/movie.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class WatchSessionsService {
  constructor(
    @InjectModel(WatchSession.name) private sessionModel: Model<WatchSessionDocument>,
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async createSession(hostId: string, movieId: string, isPrivate = true, groupId?: string) {
    const movie = await this.movieModel.findById(movieId);
    if (!movie) throw new NotFoundException('Movie not found');

    const session = await this.sessionModel.create({
      host: new Types.ObjectId(hostId),
      movie: new Types.ObjectId(movieId),
      participants: [{ user: new Types.ObjectId(hostId), joinedAt: new Date(), isActive: true }],
      state: 'waiting',
      currentTime: 0,
      playbackRate: 1,
      isPrivate,
      group: groupId ? new Types.ObjectId(groupId) : null,
    });

    return this.sessionModel
      .findById(session._id)
      .populate('host', 'username avatar')
      .populate('movie', 'title poster')
      .populate('participants.user', 'username avatar');
  }

  async joinSession(sessionId: string, userId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Watch session not found');
    if (session.state === 'ended') throw new BadRequestException('Session has already ended');

    const alreadyJoined = session.participants.some(
      (p) => p.user.toString() === userId && p.isActive,
    );

    if (!alreadyJoined) {
      const existingParticipant = session.participants.find((p) => p.user.toString() === userId);
      if (existingParticipant) {
        // Rejoin
        await this.sessionModel.findOneAndUpdate(
          { _id: sessionId, 'participants.user': new Types.ObjectId(userId) },
          { $set: { 'participants.$.isActive': true } },
        );
      } else {
        await this.sessionModel.findByIdAndUpdate(sessionId, {
          $push: {
            participants: { user: new Types.ObjectId(userId), joinedAt: new Date(), isActive: true },
          },
        });
      }
    }

    return this.getSessionState(sessionId);
  }

  async leaveSession(sessionId: string, userId: string) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Watch session not found');

    await this.sessionModel.findOneAndUpdate(
      { _id: sessionId, 'participants.user': new Types.ObjectId(userId) },
      { $set: { 'participants.$.isActive': false } },
    );

    // Check if all participants left
    const updated = await this.sessionModel.findById(sessionId);
    const activeCount = updated?.participants.filter((p) => p.isActive).length ?? 0;

    if (activeCount === 0) {
      await this.sessionModel.findByIdAndUpdate(sessionId, {
        state: 'ended',
        endedAt: new Date(),
      });
    }

    return { message: 'Left session' };
  }

  async syncPlayback(
    sessionId: string,
    userId: string,
    payload: { state: 'playing' | 'paused'; currentTime: number; playbackRate: number },
  ) {
    const session = await this.sessionModel.findById(sessionId);
    if (!session) throw new NotFoundException('Session not found');

    const isHost = session.host.toString() === userId;
    const isParticipant = session.participants.some(
      (p) => p.user.toString() === userId && p.isActive,
    );

    if (!isHost && !isParticipant) {
      throw new ForbiddenException('Not a participant of this session');
    }

    await this.sessionModel.findByIdAndUpdate(sessionId, {
      state: payload.state,
      currentTime: payload.currentTime,
      playbackRate: payload.playbackRate,
      ...(payload.state === 'playing' && !session.startedAt ? { startedAt: new Date() } : {}),
    });

    return this.getSessionState(sessionId);
  }

  async getSessionState(sessionId: string) {
    const session = await this.sessionModel
      .findById(sessionId)
      .populate('host', 'username avatar onlineStatus')
      .populate('movie', 'title poster streamUrl runtime')
      .populate('participants.user', 'username avatar onlineStatus');

    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async inviteFriends(sessionId: string, userId: string, friendIds: string[]) {
    const session = await this.sessionModel
      .findById(sessionId)
      .populate('movie', 'title');

    if (!session) throw new NotFoundException('Session not found');

    const inviter = await this.userModel.findById(userId);
    const movie = session.movie as unknown as { title: string };

    await Promise.all(
      friendIds.map((friendId) =>
        this.notificationsService.create({
          recipient: friendId,
          type: 'watch_invite',
          title: 'Watch Party Invitation',
          body: `${inviter?.username ?? 'Someone'} invited you to watch ${movie.title}`,
          data: { sessionId },
        }),
      ),
    );

    return { message: 'Invitations sent' };
  }

  async getActiveSessionsForUser(userId: string) {
    return this.sessionModel
      .find({
        'participants': { $elemMatch: { user: new Types.ObjectId(userId), isActive: true } },
        state: { $in: ['waiting', 'playing', 'paused'] },
      })
      .populate('movie', 'title poster')
      .populate('host', 'username avatar')
      .lean();
  }
}
