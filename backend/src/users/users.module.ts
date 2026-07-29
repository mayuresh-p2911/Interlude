import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Friendship, FriendshipSchema } from '../schemas/friendship.schema';
import { WatchHistory, WatchHistorySchema } from '../schemas/watch-history.schema';
import { Watchlist, WatchlistSchema } from '../schemas/watchlist.schema';
import { ContinueWatching, ContinueWatchingSchema } from '../schemas/continue-watching.schema';
import { Settings, SettingsSchema } from '../schemas/settings.schema';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: WatchHistory.name, schema: WatchHistorySchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: ContinueWatching.name, schema: ContinueWatchingSchema },
      { name: Settings.name, schema: SettingsSchema },
    ]),
    CommonModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
