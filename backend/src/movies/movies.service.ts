import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movie, MovieDocument } from '../schemas/movie.schema';
import { Genre, GenreDocument } from '../schemas/genre.schema';
import { Watchlist, WatchlistDocument } from '../schemas/watchlist.schema';
import { ContinueWatching, ContinueWatchingDocument } from '../schemas/continue-watching.schema';
import { WatchHistory, WatchHistoryDocument } from '../schemas/watch-history.schema';
import { ProviderFactory } from './providers/provider.factory';

@Injectable()
export class MoviesService {
  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    @InjectModel(Genre.name) private genreModel: Model<GenreDocument>,
    @InjectModel(Watchlist.name) private watchlistModel: Model<WatchlistDocument>,
    @InjectModel(ContinueWatching.name) private continueWatchingModel: Model<ContinueWatchingDocument>,
    @InjectModel(WatchHistory.name) private watchHistoryModel: Model<WatchHistoryDocument>,
    private providerFactory: ProviderFactory,
  ) {}

  // ── Search ────────────────────────────────────────────────
  async search(query: string, page = 1, limit = 20) {
    const provider = this.providerFactory.getProvider();
    const results = await provider.searchMovies({ query, page, limit });

    // Cache results in MongoDB
    await this.cacheMovies(results);

    // Also search local cache
    const local = await this.movieModel
      .find({ $text: { $search: query }, isActive: true })
      .limit(limit)
      .lean();

    const merged = this.mergeResults(results.map((r) => ({ ...r, _id: r.providerId })), local);
    return { data: merged.slice(0, limit), total: merged.length, page, limit };
  }

  // ── Trending ──────────────────────────────────────────────
  async getTrending(limit = 20) {
    const provider = this.providerFactory.getProvider();
    const results = await provider.getTrendingMovies(limit);
    await this.cacheMovies(results);
    return results;
  }

  // ── Recent ────────────────────────────────────────────────
  async getRecent(limit = 20) {
    const provider = this.providerFactory.getProvider();
    const results = await provider.getRecentMovies(limit);
    await this.cacheMovies(results);
    return results;
  }

  // ── By Genre ──────────────────────────────────────────────
  async getByGenre(genre: string, page = 1, limit = 20) {
    const provider = this.providerFactory.getProvider();
    const results = await provider.getMoviesByGenre(genre, page, limit);
    await this.cacheMovies(results);
    return { data: results, page, limit };
  }

  // ── Movie Detail ──────────────────────────────────────────
  async getMovieById(movieId: string) {
    // Try local cache first
    const cached = await this.movieModel.findById(movieId);
    if (cached?.streamUrl) {
      await this.movieModel.findByIdAndUpdate(movieId, { $inc: { viewCount: 1 } });
      return cached;
    }

    // Try by providerId in cache
    const byProviderId = await this.movieModel.findOne({ providerId: movieId });
    if (byProviderId?.streamUrl) {
      await this.movieModel.findByIdAndUpdate(byProviderId._id, { $inc: { viewCount: 1 } });
      return byProviderId;
    }

    // Fetch from provider
    const provider = this.providerFactory.getProvider();
    const movie = await provider.getMovieById(movieId);
    if (!movie) throw new NotFoundException('Movie not found');

    const doc = await this.upsertMovie(movie);
    await this.movieModel.findByIdAndUpdate(doc._id, { $inc: { viewCount: 1 } });
    return doc;
  }

  // ── Stream URL ────────────────────────────────────────────
  async getStreamUrl(movieId: string): Promise<string> {
    const movie = await this.movieModel.findById(movieId);
    if (movie?.streamUrl) return movie.streamUrl;

    const byProviderId = await this.movieModel.findOne({ providerId: movieId });
    if (byProviderId?.streamUrl) return byProviderId.streamUrl;

    const provider = this.providerFactory.getProvider();

    // Try direct fetch
    const url = await provider.getMovieStreamUrl(movieId);
    if (!url) throw new NotFoundException('Stream URL not available for this movie');

    // Cache it
    await this.movieModel.findOneAndUpdate(
      { providerId: movieId, provider: provider.name },
      { streamUrl: url },
    );

    return url;
  }

  // ── Genres ────────────────────────────────────────────────
  async getGenres() {
    return this.genreModel.find().sort({ name: 1 }).lean();
  }

  // ── Recommended ───────────────────────────────────────────
  async getRecommended(userId: string, limit = 20) {
    // Get recently watched genres
    const history = await this.watchHistoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('movie', 'genres')
      .limit(20)
      .lean();

    const genres: string[] = [];
    history.forEach((h) => {
      if (h.movie && (h.movie as unknown as { genres: string[] }).genres) {
        genres.push(...(h.movie as unknown as { genres: string[] }).genres);
      }
    });

    if (genres.length === 0) {
      return this.getTrending(limit);
    }

    // Find most common genre
    const genreCount = genres.reduce<Record<string, number>>((acc, g) => {
      acc[g] = (acc[g] ?? 0) + 1;
      return acc;
    }, {});

    const topGenre = Object.entries(genreCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'Drama';
    return this.getByGenre(topGenre, 1, limit).then((r) => r.data);
  }

  // ── Cache Helpers ─────────────────────────────────────────
  private async cacheMovies(movies: Awaited<ReturnType<typeof this.providerFactory.getProvider>['searchMovies']>) {
    await Promise.allSettled(movies.map((m) => this.upsertMovie(m)));
  }

  private async upsertMovie(movie: ReturnType<typeof this.providerFactory.getProvider>['searchMovies'] extends Promise<infer T> ? T[number] : never) {
    const doc = await this.movieModel.findOneAndUpdate(
      { providerId: movie.providerId, provider: movie.provider },
      {
        $setOnInsert: { createdAt: new Date() },
        $set: {
          title: movie.title,
          description: movie.description,
          poster: movie.poster,
          backdrop: movie.backdrop,
          year: movie.year,
          genres: movie.genres,
          language: movie.language,
          rating: movie.rating,
          cast: movie.cast,
          director: movie.director,
          streamUrl: movie.streamUrl,
          subtitleTracks: movie.subtitleTracks ?? [],
          audioTracks: movie.audioTracks ?? [],
        },
      },
      { upsert: true, new: true },
    );
    return doc!;
  }

  private mergeResults<T extends { providerId?: string; _id?: unknown }>(
    providerResults: T[],
    localResults: T[],
  ): T[] {
    const seen = new Set<string>();
    const merged: T[] = [];

    for (const item of [...providerResults, ...localResults]) {
      const key = String(item.providerId ?? item._id);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(item);
      }
    }

    return merged;
  }
}
