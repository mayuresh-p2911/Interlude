import { Controller, Get, Post, Delete, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Get friend list' })
  async getFriends(@CurrentUser() user: AuthUser) {
    return this.friendsService.getFriends(user._id);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get pending incoming friend requests' })
  async getPendingRequests(@CurrentUser() user: AuthUser) {
    return this.friendsService.getPendingRequests(user._id);
  }

  @Get('requests/sent')
  @ApiOperation({ summary: 'Get sent friend requests' })
  async getSentRequests(@CurrentUser() user: AuthUser) {
    return this.friendsService.getSentRequests(user._id);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get friend suggestions' })
  async getSuggestions(@CurrentUser() user: AuthUser) {
    return this.friendsService.getFriendSuggestions(user._id);
  }

  @Post('request/:userId')
  @ApiOperation({ summary: 'Send friend request' })
  async sendRequest(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.friendsService.sendFriendRequest(user._id, userId);
  }

  @Post('accept/:requestId')
  @ApiOperation({ summary: 'Accept friend request' })
  async accept(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.friendsService.acceptFriendRequest(user._id, requestId);
  }

  @Post('decline/:requestId')
  @ApiOperation({ summary: 'Decline friend request' })
  async decline(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.friendsService.declineFriendRequest(user._id, requestId);
  }

  @Delete('cancel/:requestId')
  @ApiOperation({ summary: 'Cancel sent friend request' })
  async cancel(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.friendsService.cancelFriendRequest(user._id, requestId);
  }

  @Delete('remove/:friendId')
  @ApiOperation({ summary: 'Remove friend' })
  async remove(@CurrentUser() user: AuthUser, @Param('friendId') friendId: string) {
    return this.friendsService.removeFriend(user._id, friendId);
  }

  @Post('block/:userId')
  @ApiOperation({ summary: 'Block user' })
  async block(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.friendsService.blockUser(user._id, userId);
  }

  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock user' })
  async unblock(@CurrentUser() user: AuthUser, @Param('userId') userId: string) {
    return this.friendsService.unblockUser(user._id, userId);
  }
}
