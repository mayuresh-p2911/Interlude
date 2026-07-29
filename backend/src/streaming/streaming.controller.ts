import { Controller, Get, Param, Res, Headers } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Streaming')
@Controller('stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':movieId')
  @ApiOperation({ summary: 'Proxy HLS stream for a movie' })
  @ApiBearerAuth()
  async streamMovie(
    @Param('movieId') movieId: string,
    @Res() res: Response,
    @Headers('range') rangeHeader: string,
  ) {
    await this.streamingService.proxyStream(movieId, res, rangeHeader);
  }

  @Public()
  @Get('hls/:movieId/:filename')
  @ApiOperation({ summary: 'Serve HLS segment files' })
  async serveHlsSegment(
    @Param('movieId') movieId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    await this.streamingService.serveSegment(movieId, filename, res);
  }
}
