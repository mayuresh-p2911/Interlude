import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { Movie, MovieSchema } from '../schemas/movie.schema';
import { Genre, GenreSchema } from '../schemas/genre.schema';
import { Watchlist, WatchlistSchema } from '../schemas/watchlist.schema';
import { ContinueWatching, ContinueWatchingSchema } from '../schemas/continue-watching.schema';
import { WatchHistory, WatchHistorySchema } from '../schemas/watch-history.schema';
import { ProviderFactory } from './providers/provider.factory';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Movie.name, schema: MovieSchema },
      { name: Genre.name, schema: GenreSchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: ContinueWatching.name, schema: ContinueWatchingSchema },
      { name: WatchHistory.name, schema: WatchHistorySchema },
    ]),
  ],
  controllers: [MoviesController],
  providers: [MoviesService, ProviderFactory],
  exports: [MoviesService, ProviderFactory],
})
export class MoviesModule {}
