import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User, UserSchema } from '../schemas/user.schema';
import { Movie, MovieSchema } from '../schemas/movie.schema';
import { WatchSession, WatchSessionSchema } from '../schemas/watch-session.schema';
import { Group, GroupSchema } from '../schemas/group.schema';
import { Message, MessageSchema } from '../schemas/message.schema';
import { MoviesModule } from '../movies/movies.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Movie.name, schema: MovieSchema },
      { name: WatchSession.name, schema: WatchSessionSchema },
      { name: Group.name, schema: GroupSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
    MoviesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
