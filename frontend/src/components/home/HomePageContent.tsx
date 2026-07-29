'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { moviesApi, usersApi } from '@/lib/api';
import MovieCard from '@/components/movies/MovieCard';
import MovieRow from '@/components/movies/MovieRow';
import MovieCardSkeleton from '@/components/movies/MovieCardSkeleton';
import ContinueWatchingCard from '@/components/movies/ContinueWatchingCard';
import { useAuthStore } from '@/store/authStore';

function HomeContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') ?? '';

  const { data: trending, isLoading: loadingTrending } = useQuery({
    queryKey: ['movies', 'trending'],
    queryFn: () => moviesApi.getTrending(20),
  });

  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ['movies', 'recent'],
    queryFn: () => moviesApi.getRecent(10),
  });

  const { data: recommended } = useQuery({
    queryKey: ['movies', 'recommended'],
    queryFn: () => moviesApi.getRecommended(),
  });

  const { data: continueWatching } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => usersApi.getContinueWatching(),
  });

  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ['movies', 'search', searchQuery],
    queryFn: () => moviesApi.search(searchQuery),
    enabled: !!searchQuery,
  });

  const trendingMovies = (trending?.data as { data?: unknown[] })?.data ?? trending?.data ?? [];
  const recentMovies = (recent?.data as unknown[]) ?? [];
  const continueList = (continueWatching?.data as unknown[]) ?? [];
  const recommendedMovies = (recommended?.data as unknown[]) ?? [];
  const searchMovies = (searchResults?.data as { data?: unknown[] })?.data ?? [];

  if (searchQuery) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-white mb-6">
          Results for <span className="text-gradient-blue">"{searchQuery}"</span>
        </h1>
        {loadingSearch ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <MovieCardSkeleton key={i} />)}
          </div>
        ) : searchMovies.length === 0 ? (
          <div className="text-center py-20 text-text-muted">No results found for "{searchQuery}"</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {(searchMovies as Record<string, unknown>[]).map((movie) => (
              <MovieCard key={String(movie._id ?? movie.providerId)} movie={movie} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-24 lg:pb-8">
      {/* Hero Banner — first trending movie */}
      {!loadingTrending && (trendingMovies as Record<string, unknown>[]).length > 0 && (
        <HeroBanner movie={(trendingMovies as Record<string, unknown>[])[0]} />
      )}

      <div className="px-6 py-8 space-y-10">
        {/* Continue Watching */}
        {continueList.length > 0 && (
          <MovieRow title="Continue Watching" showProgress>
            {(continueList as Record<string, unknown>[]).map((item) => (
              <ContinueWatchingCard key={String((item as { _id?: string })._id)} item={item} />
            ))}
          </MovieRow>
        )}

        {/* Trending */}
        <MovieRow title="Trending Now" loading={loadingTrending}>
          {(trendingMovies as Record<string, unknown>[]).map((movie) => (
            <MovieCard key={String(movie._id ?? movie.providerId)} movie={movie} />
          ))}
        </MovieRow>

        {/* Recommended */}
        {recommendedMovies.length > 0 && (
          <MovieRow title={`Recommended for ${user?.username}`}>
            {(recommendedMovies as Record<string, unknown>[]).map((movie) => (
              <MovieCard key={String(movie._id ?? movie.providerId)} movie={movie} />
            ))}
          </MovieRow>
        )}

        {/* Recently Added */}
        <MovieRow title="Recently Added" loading={loadingRecent}>
          {(recentMovies as Record<string, unknown>[]).map((movie) => (
            <MovieCard key={String((movie as Record<string, unknown>)._id ?? (movie as Record<string, unknown>).providerId)} movie={movie as Record<string, unknown>} />
          ))}
        </MovieRow>
      </div>
    </div>
  );
}

function HeroBanner({ movie }: { movie: Record<string, unknown> }) {
  const backdrop = String(movie.backdrop ?? movie.poster ?? '/placeholder.jpg');
  const title = String(movie.title ?? '');
  const description = String(movie.description ?? '');
  const movieId = String(movie._id ?? movie.providerId ?? '');

  return (
    <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backdrop})` }}
      />
      <div className="absolute inset-0 bg-cinema-overlay" />
      <div className="absolute inset-0 bg-gradient-to-r from-black-midnight via-black-midnight/50 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full flex items-end pb-12 px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-lg"
        >
          <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">{title}</h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-6 line-clamp-3">{description}</p>
          <div className="flex gap-3">
            <a
              href={`/movies/${movieId}`}
              className="btn-primary py-3 px-6 text-sm inline-flex items-center gap-2"
            >
              ▶ Watch Now
            </a>
            <a
              href={`/movies/${movieId}`}
              className="btn-ghost py-3 px-6 text-sm"
            >
              More Info
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function HomePageContent() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}
