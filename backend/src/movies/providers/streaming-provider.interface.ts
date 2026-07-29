// ============================================================
// INTERLUDE — Streaming Provider Interface
// Implement this interface to add new streaming providers.
// Set STREAMING_PROVIDER env var to switch providers.
// ============================================================

export interface StreamingProviderMovie {
  providerId: string;
  provider: string;
  title: string;
  description: string;
  poster?: string;
  backdrop?: string;
  year?: number;
  runtime?: number;
  genres: string[];
  language?: string;
  rating?: number;
  cast?: string[];
  director?: string;
  streamUrl?: string;
  subtitleTracks?: Array<{ label: string; language: string; url: string }>;
  audioTracks?: Array<{ label: string; language: string }>;
}

export interface StreamingProviderSearchOptions {
  query: string;
  genre?: string;
  page?: number;
  limit?: number;
}

export abstract class StreamingProvider {
  abstract readonly name: string;

  abstract searchMovies(options: StreamingProviderSearchOptions): Promise<StreamingProviderMovie[]>;

  abstract getTrendingMovies(limit?: number): Promise<StreamingProviderMovie[]>;

  abstract getMovieById(providerId: string): Promise<StreamingProviderMovie | null>;

  abstract getMovieStreamUrl(providerId: string): Promise<string | null>;

  abstract getMoviesByGenre(genre: string, page?: number, limit?: number): Promise<StreamingProviderMovie[]>;

  abstract getRecentMovies(limit?: number): Promise<StreamingProviderMovie[]>;
}
