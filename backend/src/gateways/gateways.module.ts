import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { WatchGateway } from './watch.gateway';
import { VoiceGateway } from './voice.gateway';
import { PresenceGateway } from './presence.gateway';
import { ChatModule } from '../chat/chat.module';
import { WatchSessionsModule } from '../watch-sessions/watch-sessions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({}),
    ChatModule,
    WatchSessionsModule,
    NotificationsModule,
  ],
  providers: [ChatGateway, WatchGateway, VoiceGateway, PresenceGateway],
  exports: [PresenceGateway],
})
export class GatewaysModule {}
