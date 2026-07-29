import { Controller, Get, Post, Param, Body, Query, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { IsString, IsOptional } from 'class-validator';

class SendMessageDto {
  @IsString() content: string;
  @IsOptional() type?: 'text' | 'image' | 'movie_share';
  @IsOptional() movieRef?: { movieId: string; title: string; poster?: string };
}

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all DM conversations' })
  async getConversations(@CurrentUser() user: AuthUser) {
    return this.chatService.getConversations(user._id);
  }

  @Get('dm/:userId')
  @ApiOperation({ summary: 'Get DM history with a user' })
  async getDMs(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getDirectMessages(user._id, userId, Number(page), Number(limit));
  }

  @Post('dm/:userId')
  @ApiOperation({ summary: 'Send a direct message' })
  async sendDM(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendDirectMessage(
      user._id,
      userId,
      dto.content,
      dto.type ?? 'text',
      { movieRef: dto.movieRef },
    );
  }

  @Post('dm/:userId/image')
  @ApiOperation({ summary: 'Send an image DM' })
  @UseInterceptors(FileInterceptor('image'))
  async sendImageDM(
    @CurrentUser() user: AuthUser,
    @Param('userId') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const imageUrl = await this.chatService.uploadMessageImage(user._id, userId, file.buffer);
    return this.chatService.sendDirectMessage(user._id, userId, imageUrl, 'image', { imageUrl });
  }

  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get group chat messages' })
  async getGroupMessages(
    @Param('groupId') groupId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getGroupMessages(groupId, Number(page), Number(limit));
  }

  @Post('group/:groupId')
  @ApiOperation({ summary: 'Send group message' })
  async sendGroupMessage(
    @CurrentUser() user: AuthUser,
    @Param('groupId') groupId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendGroupMessage(
      user._id,
      groupId,
      dto.content,
      dto.type ?? 'text',
      { movieRef: dto.movieRef },
    );
  }
}
