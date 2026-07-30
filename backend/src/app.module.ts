import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { FriendsModule } from './friends/friends.module';
import { GroupsModule } from './groups/groups.module';
import { MoviesModule } from './movies/movies.module';
import { StreamingModule } from './streaming/streaming.module';
import { WatchSessionsModule } from './watch-sessions/watch-sessions.module';
import { ChatModule } from './chat/chat.module';
import { VoiceModule } from './voice/voice.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdminModule } from './admin/admin.module';
import { GatewaysModule } from './gateways/gateways.module';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),

    // ── Database ─────────────────────────────────────────────
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        authSource: 'admin',
      }),
      inject: [ConfigService],
    }),

    // ── Rate Limiting ─────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // ── Scheduling ────────────────────────────────────────────
    ScheduleModule.forRoot(),

    // ── Feature Modules ───────────────────────────────────────
    AuthModule,
    UsersModule,
    FriendsModule,
    GroupsModule,
    MoviesModule,
    StreamingModule,
    WatchSessionsModule,
    ChatModule,
    VoiceModule,
    NotificationsModule,
    AdminModule,
    GatewaysModule,
  ],
})
export class AppModule {}
