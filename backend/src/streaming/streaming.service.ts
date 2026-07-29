import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { MoviesService } from '../movies/movies.service';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(private readonly moviesService: MoviesService) {}

  // Proxy the stream through the server so the backend remains authoritative.
  // This also allows future DRM / token injection without frontend changes.
  async proxyStream(movieId: string, res: Response, rangeHeader?: string) {
    let streamUrl: string;
    try {
      streamUrl = await this.moviesService.getStreamUrl(movieId);
    } catch {
      throw new NotFoundException('Stream not available for this movie');
    }

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'INTERLUDE/1.0',
      };

      if (rangeHeader) {
        headers['Range'] = rangeHeader;
      }

      const response = await axios.get<NodeJS.ReadableStream>(streamUrl, {
        responseType: 'stream',
        headers,
        validateStatus: (status) => status < 500,
      });

      // Forward relevant headers
      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
      ];
      forwardHeaders.forEach((header) => {
        const value = response.headers[header] as string | undefined;
        if (value) res.setHeader(header, value);
      });

      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.status(response.status);
      response.data.pipe(res);
    } catch (error) {
      this.logger.error(`Stream proxy error for ${movieId}:`, error);
      res.status(502).json({ message: 'Stream temporarily unavailable' });
    }
  }

  async serveSegment(movieId: string, filename: string, res: Response) {
    try {
      const streamUrl = await this.moviesService.getStreamUrl(movieId);
      const baseUrl = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
      const segmentUrl = `${baseUrl}${filename}`;

      const response = await axios.get<NodeJS.ReadableStream>(segmentUrl, {
        responseType: 'stream',
        headers: { 'User-Agent': 'INTERLUDE/1.0' },
      });

      const contentType = response.headers['content-type'] as string | undefined;
      res.setHeader('Content-Type', contentType ?? 'video/mp2t');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      response.data.pipe(res);
    } catch (error) {
      this.logger.error(`Segment serve error for ${movieId}/${filename}:`, error);
      res.status(404).json({ message: 'Segment not found' });
    }
  }
}
