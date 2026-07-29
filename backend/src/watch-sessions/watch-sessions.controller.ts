import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WatchSessionsService } from './watch-sessions.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { IsString, IsBoolean, IsOptional, IsArray } from 'class-validator';

class CreateSessionDto {
  @IsString() movieId: string;
  @IsOptional() @IsBoolean() isPrivate?: boolean;
  @IsOptional() @IsString() groupId?: string;
}

class SyncPayloadDto {
  @IsString() state: 'playing' | 'paused';
  currentTime: number;
  playbackRate: number;
}

class InviteDto {
  @IsArray() @IsString({ each: true }) friendIds: string[];
}

@ApiTags('Watch Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class WatchSessionsController {
  constructor(private readonly service: WatchSessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new watch session' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.service.createSession(user._id, dto.movieId, dto.isPrivate, dto.groupId);
  }

  @Post(':sessionId/join')
  @ApiOperation({ summary: 'Join a watch session' })
  async join(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.service.joinSession(sessionId, user._id);
  }

  @Delete(':sessionId/leave')
  @ApiOperation({ summary: 'Leave a watch session' })
  async leave(@CurrentUser() user: AuthUser, @Param('sessionId') sessionId: string) {
    return this.service.leaveSession(sessionId, user._id);
  }

  @Post(':sessionId/sync')
  @ApiOperation({ summary: 'Sync playback state (host only)' })
  async sync(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: SyncPayloadDto,
  ) {
    return this.service.syncPlayback(sessionId, user._id, dto);
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'Get watch session state' })
  async getState(@Param('sessionId') sessionId: string) {
    return this.service.getSessionState(sessionId);
  }

  @Post(':sessionId/invite')
  @ApiOperation({ summary: 'Invite friends to session' })
  async invite(
    @CurrentUser() user: AuthUser,
    @Param('sessionId') sessionId: string,
    @Body() dto: InviteDto,
  ) {
    return this.service.inviteFriends(sessionId, user._id, dto.friendIds);
  }

  @Get('user/active')
  @ApiOperation({ summary: 'Get user active sessions' })
  async getActiveSessions(@CurrentUser() user: AuthUser) {
    return this.service.getActiveSessionsForUser(user._id);
  }
}
