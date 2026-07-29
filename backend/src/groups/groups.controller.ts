import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  UseInterceptors, UploadedFile, ParseFilePipe,
  MaxFileSizeValidator, FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto, InviteMembersDto, AddToQueueDto } from './dto/update-group.dto';

@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user groups' })
  async getUserGroups(@CurrentUser() user: AuthUser) {
    return this.groupsService.getUserGroups(user._id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new group' })
  async createGroup(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(user._id, dto);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get group details' })
  async getGroup(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.groupsService.getGroup(groupId, user._id);
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update group settings' })
  async updateGroup(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(groupId, user._id, dto);
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete group (creator only)' })
  async deleteGroup(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.groupsService.deleteGroup(groupId, user._id);
  }

  @Post(':groupId/invite')
  @ApiOperation({ summary: 'Invite members to group' })
  async invite(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: InviteMembersDto,
  ) {
    return this.groupsService.inviteMembers(groupId, user._id, dto.memberIds);
  }

  @Delete(':groupId/leave')
  @ApiOperation({ summary: 'Leave group' })
  async leave(@CurrentUser() user: AuthUser, @Param('groupId') groupId: string) {
    return this.groupsService.leaveGroup(groupId, user._id);
  }

  @Post(':groupId/picture')
  @ApiOperation({ summary: 'Upload group picture' })
  @UseInterceptors(FileInterceptor('picture'))
  async uploadPicture(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.groupsService.uploadGroupPicture(groupId, user._id, file.buffer);
  }

  @Post(':groupId/queue')
  @ApiOperation({ summary: 'Add movie to group queue' })
  async addToQueue(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: AddToQueueDto,
  ) {
    return this.groupsService.addToQueue(groupId, user._id, dto);
  }

  @Delete(':groupId/queue/:movieId')
  @ApiOperation({ summary: 'Remove movie from group queue' })
  async removeFromQueue(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Param('movieId') movieId: string,
  ) {
    return this.groupsService.removeFromQueue(groupId, user._id, movieId);
  }
}
