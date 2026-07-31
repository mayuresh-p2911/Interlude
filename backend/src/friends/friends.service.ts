import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FriendRequest, FriendRequestDocument } from '../schemas/friend-request.schema';
import { Friendship, FriendshipDocument } from '../schemas/friendship.schema';
import { Block, BlockDocument } from '../schemas/block.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(FriendRequest.name) private friendRequestModel: Model<FriendRequestDocument>,
    @InjectModel(Friendship.name) private friendshipModel: Model<FriendshipDocument>,
    @InjectModel(Block.name) private blockModel: Model<BlockDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  async sendFriendRequest(senderId: string, receiverId: string) {
    if (senderId === receiverId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    const receiver = await this.userModel.findById(receiverId);
    if (!receiver) throw new NotFoundException('User not found');

    const senderObjId = new Types.ObjectId(senderId);
    const receiverObjId = new Types.ObjectId(receiverId);

    // Check if blocked
    const isBlocked = await this.blockModel.findOne({
      $or: [
        { blocker: senderObjId, blocked: receiverObjId },
        { blocker: receiverObjId, blocked: senderObjId },
      ],
    });
    if (isBlocked) throw new ForbiddenException('Cannot send friend request');

    // Check existing friendship
    const alreadyFriends = await this.friendshipModel.findOne({
      user: senderObjId,
      friend: receiverObjId,
    });
    if (alreadyFriends) throw new ConflictException('Already friends');

    // Check existing request in any direction
    const existingRequest = await this.friendRequestModel.findOne({
      $or: [
        { sender: senderObjId, receiver: receiverObjId },
        { sender: receiverObjId, receiver: senderObjId },
      ],
    });

    let request;
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new ConflictException('Friend request already pending');
      }
      // Re-activate previously declined or cancelled request
      existingRequest.sender = senderObjId;
      existingRequest.receiver = receiverObjId;
      existingRequest.status = 'pending';
      request = await existingRequest.save();
    } else {
      request = await this.friendRequestModel.create({
        sender: senderObjId,
        receiver: receiverObjId,
        status: 'pending',
      });
    }

    const sender = await this.userModel.findById(senderId);

    await this.notificationsService.create({
      recipient: receiverId,
      type: 'friend_request',
      title: 'New Friend Request',
      body: `${sender?.username ?? 'Someone'} sent you a friend request`,
      data: { requestId: request._id.toString(), senderId },
    });

    return request;
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.receiver.toString() !== userId) throw new ForbiddenException('Not authorized');
    if (request.status !== 'pending') throw new BadRequestException('Request is no longer pending');

    await this.friendRequestModel.findByIdAndUpdate(requestId, { status: 'accepted' });

    // Create bidirectional friendship
    const senderId = request.sender.toString();
    await Promise.all([
      this.friendshipModel.create({
        user: new Types.ObjectId(userId),
        friend: new Types.ObjectId(senderId),
      }),
      this.friendshipModel.create({
        user: new Types.ObjectId(senderId),
        friend: new Types.ObjectId(userId),
      }),
    ]);

    const receiver = await this.userModel.findById(userId);
    await this.notificationsService.create({
      recipient: senderId,
      type: 'friend_accepted',
      title: 'Friend Request Accepted',
      body: `${receiver?.username ?? 'Someone'} accepted your friend request`,
      data: { userId },
    });

    return { message: 'Friend request accepted' };
  }

  async declineFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.receiver.toString() !== userId) throw new ForbiddenException('Not authorized');

    await this.friendRequestModel.findByIdAndUpdate(requestId, { status: 'declined' });
    return { message: 'Friend request declined' };
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.friendRequestModel.findById(requestId);
    if (!request) throw new NotFoundException('Friend request not found');
    if (request.sender.toString() !== userId) throw new ForbiddenException('Not authorized');

    await this.friendRequestModel.findByIdAndUpdate(requestId, { status: 'cancelled' });
    return { message: 'Friend request cancelled' };
  }

  async removeFriend(userId: string, friendId: string) {
    await Promise.all([
      this.friendshipModel.deleteOne({
        user: new Types.ObjectId(userId),
        friend: new Types.ObjectId(friendId),
      }),
      this.friendshipModel.deleteOne({
        user: new Types.ObjectId(friendId),
        friend: new Types.ObjectId(userId),
      }),
    ]);
    return { message: 'Friend removed' };
  }

  async blockUser(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('Cannot block yourself');

    // Remove any existing friendship
    await this.removeFriend(userId, targetId).catch(() => {});

    try {
      await this.blockModel.create({
        blocker: new Types.ObjectId(userId),
        blocked: new Types.ObjectId(targetId),
      });
    } catch {
      // Already blocked — ignore
    }

    return { message: 'User blocked' };
  }

  async unblockUser(userId: string, targetId: string) {
    await this.blockModel.deleteOne({
      blocker: new Types.ObjectId(userId),
      blocked: new Types.ObjectId(targetId),
    });
    return { message: 'User unblocked' };
  }

  async getFriends(userId: string) {
    const friendships = await this.friendshipModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('friend', 'username avatar onlineStatus currentActivity lastSeen')
      .lean();

    return friendships.map((f) => f.friend);
  }

  async getPendingRequests(userId: string) {
    return this.friendRequestModel
      .find({ receiver: new Types.ObjectId(userId), status: 'pending' })
      .populate('sender', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getSentRequests(userId: string) {
    return this.friendRequestModel
      .find({ sender: new Types.ObjectId(userId), status: 'pending' })
      .populate('receiver', 'username avatar')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getFriendSuggestions(userId: string, limit = 10) {
    const friends = await this.friendshipModel
      .find({ user: new Types.ObjectId(userId) })
      .select('friend')
      .lean();
    const friendIds = friends.map((f) => f.friend.toString());

    const blockedUsers = await this.blockModel
      .find({
        $or: [{ blocker: userId }, { blocked: userId }],
      })
      .lean();
    const blockedIds = blockedUsers.flatMap((b) => [b.blocker.toString(), b.blocked.toString()]);

    const pendingRequests = await this.friendRequestModel
      .find({
        $or: [{ sender: new Types.ObjectId(userId) }, { receiver: new Types.ObjectId(userId) }],
        status: 'pending',
      })
      .lean();
    const pendingIds = pendingRequests.flatMap((p) => [p.sender.toString(), p.receiver.toString()]);

    const excludedIds = [...new Set([userId, ...friendIds, ...blockedIds, ...pendingIds])].map(
      (id) => new Types.ObjectId(id),
    );

    // Suggest friends-of-friends
    const friendOfFriendIds = await this.friendshipModel
      .find({ user: { $in: friendIds.map((id) => new Types.ObjectId(id)) } })
      .select('friend')
      .lean();

    const suggestedIds = friendOfFriendIds
      .map((f) => f.friend.toString())
      .filter((id) => !excludedIds.map((e) => e.toString()).includes(id));

    const uniqueSuggested = [...new Set(suggestedIds)].slice(0, limit);

    if (uniqueSuggested.length < limit) {
      // Fill with random non-friends
      const random = await this.userModel
        .find({ _id: { $nin: excludedIds }, isBlocked: false })
        .select('username avatar bio onlineStatus')
        .limit(limit - uniqueSuggested.length)
        .lean();

      const suggested = await this.userModel
        .find({ _id: { $in: uniqueSuggested.map((id) => new Types.ObjectId(id)) } })
        .select('username avatar bio onlineStatus')
        .lean();

      return [...suggested, ...random];
    }

    return this.userModel
      .find({ _id: { $in: uniqueSuggested.map((id) => new Types.ObjectId(id)) } })
      .select('username avatar bio onlineStatus')
      .lean();
  }

  async areFriends(userId: string, targetId: string): Promise<boolean> {
    const friendship = await this.friendshipModel.findOne({
      user: new Types.ObjectId(userId),
      friend: new Types.ObjectId(targetId),
    });
    return !!friendship;
  }
}
