import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search users by username' })
  async searchUsers(@Query('q') query: string, @CurrentUser() user: AuthUser) {
    return this.usersService.searchUsers(query, user._id);
  }

  @Get('me/watchlist')
  @ApiOperation({ summary: 'Get authenticated user watchlist' })
  async getMyWatchlist(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getWatchlist(user._id, page, limit);
  }

  @Post('me/watchlist/:movieId')
  @ApiOperation({ summary: 'Add movie to watchlist' })
  async addToWatchlist(@CurrentUser() user: AuthUser, @Param('movieId') movieId: string) {
    return this.usersService.addToWatchlist(user._id, movieId);
  }

  @Delete('me/watchlist/:movieId')
  @ApiOperation({ summary: 'Remove movie from watchlist' })
  async removeFromWatchlist(@CurrentUser() user: AuthUser, @Param('movieId') movieId: string) {
    return this.usersService.removeFromWatchlist(user._id, movieId);
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get watch history' })
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getWatchHistory(user._id, page, limit);
  }

  @Get('me/continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  async getContinueWatching(@CurrentUser() user: AuthUser) {
    return this.usersService.getContinueWatching(user._id);
  }

  @Get('me/settings')
  @ApiOperation({ summary: 'Get user settings' })
  async getSettings(@CurrentUser() user: AuthUser) {
    return this.usersService.getSettings(user._id);
  }

  @Patch('me/settings')
  @ApiOperation({ summary: 'Update user settings' })
  async updateSettings(@CurrentUser() user: AuthUser, @Body() body: Record<string, unknown>) {
    return this.usersService.updateSettings(user._id, body as never);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile' })
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user._id, dto);
  }

  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  async uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file provided');
    }
    return this.usersService.uploadAvatar(user._id, file.buffer);
  }

  @Get(':username')
  @ApiOperation({ summary: 'Get public user profile by username' })
  async getProfile(@Param('username') username: string, @CurrentUser() user: AuthUser) {
    return this.usersService.findByUsername(username, user._id);
  }

  @Get(':username/friends')
  @ApiOperation({ summary: 'Get user friend list' })
  async getUserFriends(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    return this.usersService.getUserFriends(String((user as any)._id));
  }
}
