import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WatchSessionsController } from './watch-sessions.controller';
import { WatchSessionsService } from './watch-sessions.service';
import { WatchSession, WatchSessionSchema } from '../schemas/watch-session.schema';
import { Movie, MovieSchema } from '../schemas/movie.schema';
import { Friendship, FriendshipSchema } from '../schemas/friendship.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { MoviesModule } from '../movies/movies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WatchSession.name, schema: WatchSessionSchema },
      { name: Movie.name, schema: MovieSchema },
      { name: Friendship.name, schema: FriendshipSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
    MoviesModule,
  ],
  controllers: [WatchSessionsController],
  providers: [WatchSessionsService],
  exports: [WatchSessionsService],
})
export class WatchSessionsModule {}
