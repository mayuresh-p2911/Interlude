import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { UploadService } from '../common/upload.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
    private uploadService: UploadService,
  ) {}

  async createGroup(userId: string, dto: CreateGroupDto) {
    const group = await this.groupModel.create({
      name: dto.name,
      description: dto.description ?? '',
      members: [new Types.ObjectId(userId)],
      createdBy: new Types.ObjectId(userId),
    });
    return this.groupModel.findById(group._id).populate('members', 'username avatar onlineStatus');
  }

  async getUserGroups(userId: string) {
    return this.groupModel
      .find({ members: new Types.ObjectId(userId) })
      .populate('members', 'username avatar onlineStatus')
      .sort({ updatedAt: -1 })
      .lean();
  }

  async getGroup(groupId: string, userId: string) {
    const group = await this.groupModel
      .findById(groupId)
      .populate('members', 'username avatar onlineStatus currentActivity');

    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);
    return group;
  }

  async updateGroup(groupId: string, userId: string, dto: UpdateGroupDto) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    const updates: Partial<Group> = {};
    if (dto.name) updates.name = dto.name;
    if (dto.description !== undefined) updates.description = dto.description;

    return this.groupModel
      .findByIdAndUpdate(groupId, updates, { new: true })
      .populate('members', 'username avatar onlineStatus');
  }

  async deleteGroup(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    if (group.createdBy.toString() !== userId) {
      throw new ForbiddenException('Only the group creator can delete this group');
    }
    await this.groupModel.findByIdAndDelete(groupId);
    return { message: 'Group deleted' };
  }

  async inviteMembers(groupId: string, userId: string, memberIds: string[]) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    const newMemberIds = memberIds
      .filter((id) => !group.members.map((m) => m.toString()).includes(id))
      .map((id) => new Types.ObjectId(id));

    if (newMemberIds.length === 0) {
      throw new BadRequestException('All specified users are already members');
    }

    await this.groupModel.findByIdAndUpdate(groupId, {
      $addToSet: { members: { $each: newMemberIds } },
    });

    const inviter = await this.userModel.findById(userId);
    await Promise.all(
      newMemberIds.map((memberId) =>
        this.notificationsService.create({
          recipient: memberId.toString(),
          type: 'group_invite',
          title: 'Group Invitation',
          body: `${inviter?.username ?? 'Someone'} added you to ${group.name}`,
          data: { groupId },
        }),
      ),
    );

    return this.groupModel
      .findById(groupId)
      .populate('members', 'username avatar onlineStatus');
  }

  async leaveGroup(groupId: string, userId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    if (group.members.length === 1) {
      // Last member — delete group
      await this.groupModel.findByIdAndDelete(groupId);
      return { message: 'Group deleted as you were the last member' };
    }

    await this.groupModel.findByIdAndUpdate(groupId, {
      $pull: { members: new Types.ObjectId(userId) },
    });

    // Transfer creator if leaving
    if (group.createdBy.toString() === userId) {
      const newCreator = group.members.find((m) => m.toString() !== userId);
      if (newCreator) {
        await this.groupModel.findByIdAndUpdate(groupId, { createdBy: newCreator });
      }
    }

    return { message: 'Left group successfully' };
  }

  async uploadGroupPicture(groupId: string, userId: string, buffer: Buffer) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    const pictureUrl = await this.uploadService.uploadGroupPicture(buffer, groupId);
    await this.groupModel.findByIdAndUpdate(groupId, { picture: pictureUrl });
    return { picture: pictureUrl };
  }

  async addToQueue(groupId: string, userId: string, movieData: { movieId: string; title: string; poster?: string }) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    const queueItem = {
      movieId: movieData.movieId,
      title: movieData.title,
      poster: movieData.poster,
      addedBy: new Types.ObjectId(userId),
      addedAt: new Date(),
    };

    return this.groupModel
      .findByIdAndUpdate(
        groupId,
        { $push: { movieQueue: queueItem } },
        { new: true },
      )
      .populate('members', 'username avatar');
  }

  async removeFromQueue(groupId: string, userId: string, movieId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    this.assertMember(group, userId);

    return this.groupModel.findByIdAndUpdate(
      groupId,
      { $pull: { movieQueue: { movieId } } },
      { new: true },
    );
  }

  private assertMember(group: GroupDocument, userId: string) {
    const isMember = group.members.some((m) => m.toString() === userId);
    if (!isMember) throw new ForbiddenException('You are not a member of this group');
  }
}
