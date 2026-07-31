import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { Message, MessageSchema } from '../schemas/message.schema';
import { Settings, SettingsSchema } from '../schemas/settings.schema';
import { Friendship, FriendshipSchema } from '../schemas/friendship.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Settings.name, schema: SettingsSchema },
      { name: Friendship.name, schema: FriendshipSchema },
    ]),
    CommonModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
