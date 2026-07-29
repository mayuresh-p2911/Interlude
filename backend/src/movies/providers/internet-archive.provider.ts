import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  StreamingProvider,
  StreamingProviderMovie,
  StreamingProviderSearchOptions,
} from './streaming-provider.interface';

interface ArchiveSearchDoc {
  identifier: string;
  title?: string;
  description?: string | string[];
  subject?: string | string[];
  date?: string;
  creator?: string | string[];
  runtime?: string;
  language?: string;
  avg_rating?: number;
  thumb?: string;
}

interface ArchiveSearchResponse {
  response: {
    docs: ArchiveSearchDoc[];
    numFound: number;
  };
}

interface ArchiveMetadataFile {
  name: string;
  format: string;
  source?: string;
  original?: string;
  size?: string;
  url?: string;
  title?: string;
  language?: string;
}

interface ArchiveMetadata {
  metadata?: {
    title?: string | string[];
    description?: string | string[];
    subject?: string | string[];
    date?: string;
    creator?: string | string[];
    runtime?: string;
    language?: string;
    avg_rating?: number;
  };
  files?: ArchiveMetadataFile[];
}

@Injectable()
export class InternetArchiveProvider extends StreamingProvider {
  readonly name = 'internet_archive';
  private readonly logger = new Logger(InternetArchiveProvider.name);
  private readonly baseUrl: string;
  private readonly searchBase = 'https://archive.org/advancedsearch.php';
  private readonly metaBase = 'https://archive.org/metadata';
  private readonly detailsBase = 'https://archive.org/details';

  constructor() {
    super();
    this.baseUrl = process.env.INTERNET_ARCHIVE_API_BASE ?? 'https://archive.org';
  }

  // ── Search ────────────────────────────────────────────────
  async searchMovies(options: StreamingProviderSearchOptions): Promise<StreamingProviderMovie[]> {
    try {
      const page = options.page ?? 1;
      const limit = options.limit ?? 20;
      const params = new URLSearchParams({
        q: `(${options.query}) AND mediatype:movies AND -collection:test_collection`,
        fl: 'identifier,title,description,subject,date,creator,runtime,language,avg_rating,thumb',
        rows: String(limit),
        page: String(page),
        output: 'json',
        sort: 'avg_rating desc',
      });

      const response = await axios.get<ArchiveSearchResponse>(`${this.searchBase}?${params.toString()}`);
      return response.data.response.docs.map((doc) => this.mapDocToMovie(doc));
    } catch (error) {
      this.logger.error('Internet Archive search failed:', error);
      return [];
    }
  }

  // ── Trending ──────────────────────────────────────────────
  async getTrendingMovies(limit = 20): Promise<StreamingProviderMovie[]> {
    return this.searchMovies({ query: 'feature film', limit });
  }

  // ── By Genre ──────────────────────────────────────────────
  async getMoviesByGenre(genre: string, page = 1, limit = 20): Promise<StreamingProviderMovie[]> {
    return this.searchMovies({ query: genre, page, limit });
  }

  // ── Recent ────────────────────────────────────────────────
  async getRecentMovies(limit = 20): Promise<StreamingProviderMovie[]> {
    try {
      const params = new URLSearchParams({
        q: 'mediatype:movies AND -collection:test_collection AND licenseurl:*creative*',
        fl: 'identifier,title,description,subject,date,creator,runtime,language,avg_rating,thumb',
        rows: String(limit),
        output: 'json',
        sort: 'addeddate desc',
      });

      const response = await axios.get<ArchiveSearchResponse>(`${this.searchBase}?${params.toString()}`);
      return response.data.response.docs.map((doc) => this.mapDocToMovie(doc));
    } catch {
      return [];
    }
  }

  // ── Movie Detail ──────────────────────────────────────────
  async getMovieById(providerId: string): Promise<StreamingProviderMovie | null> {
    try {
      const response = await axios.get<ArchiveMetadata>(`${this.metaBase}/${providerId}`);
      const { metadata, files } = response.data;
      if (!metadata) return null;

      const streamUrl = this.extractStreamUrl(providerId, files ?? []);
      const subtitleTracks = this.extractSubtitleTracks(providerId, files ?? []);
      const audioTracks = this.extractAudioTracks(files ?? []);

      return {
        providerId,
        provider: this.name,
        title: this.firstOf(metadata.title) ?? providerId,
        description: this.firstOf(metadata.description) ?? '',
        poster: `https://archive.org/services/img/${providerId}`,
        backdrop: `https://archive.org/services/img/${providerId}`,
        year: metadata.date ? parseInt(metadata.date.slice(0, 4)) : undefined,
        genres: this.toArray(metadata.subject).slice(0, 5),
        language: this.firstOf(metadata.language),
        rating: metadata.avg_rating ? parseFloat(String(metadata.avg_rating)) : undefined,
        cast: this.toArray(metadata.creator),
        streamUrl,
        subtitleTracks,
        audioTracks,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch movie ${providerId}:`, error);
      return null;
    }
  }

  // ── Stream URL ────────────────────────────────────────────
  async getMovieStreamUrl(providerId: string): Promise<string | null> {
    try {
      const response = await axios.get<ArchiveMetadata>(`${this.metaBase}/${providerId}`);
      return this.extractStreamUrl(providerId, response.data.files ?? []);
    } catch {
      return null;
    }
  }

  // ── Helpers ───────────────────────────────────────────────
  private mapDocToMovie(doc: ArchiveSearchDoc): StreamingProviderMovie {
    return {
      providerId: doc.identifier,
      provider: this.name,
      title: doc.title ?? doc.identifier,
      description: this.firstOf(doc.description) ?? '',
      poster: `https://archive.org/services/img/${doc.identifier}`,
      backdrop: `https://archive.org/services/img/${doc.identifier}`,
      year: doc.date ? parseInt(doc.date.slice(0, 4)) : undefined,
      genres: this.toArray(doc.subject).slice(0, 5),
      language: doc.language,
      rating: doc.avg_rating,
      cast: this.toArray(doc.creator),
    };
  }

  private extractStreamUrl(identifier: string, files: ArchiveMetadataFile[]): string | null {
    // Prefer HLS, then mp4, then ogv
    const hls = files.find((f) => f.format === 'HLS' && f.name?.endsWith('.m3u8'));
    if (hls) return `https://archive.org/download/${identifier}/${hls.name}`;

    const mp4 = files.find(
      (f) => f.format === 'MPEG4' && !f.name?.includes('_512kb') && f.source === 'derivative',
    ) ?? files.find((f) => f.format === 'MPEG4');
    if (mp4) return `https://archive.org/download/${identifier}/${mp4.name}`;

    const ogv = files.find((f) => f.format === 'Ogg Video');
    if (ogv) return `https://archive.org/download/${identifier}/${ogv.name}`;

    return null;
  }

  private extractSubtitleTracks(
    identifier: string,
    files: ArchiveMetadataFile[],
  ): Array<{ label: string; language: string; url: string }> {
    return files
      .filter((f) => f.name?.endsWith('.srt') || f.name?.endsWith('.vtt'))
      .map((f) => ({
        label: f.title ?? f.language ?? 'Subtitles',
        language: f.language ?? 'en',
        url: `https://archive.org/download/${identifier}/${f.name}`,
      }));
  }

  private extractAudioTracks(files: ArchiveMetadataFile[]): Array<{ label: string; language: string }> {
    const languages = [...new Set(files.filter((f) => f.language).map((f) => f.language as string))];
    return languages.map((lang) => ({ label: lang.toUpperCase(), language: lang }));
  }

  private firstOf(value: string | string[] | undefined): string | undefined {
    if (!value) return undefined;
    return Array.isArray(value) ? value[0] : value;
  }

  private toArray(value: string | string[] | undefined): string[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }
}
