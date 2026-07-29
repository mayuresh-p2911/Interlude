import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MoviesService } from './movies.service';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Movies')
@ApiBearerAuth()
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('trending')
  @ApiOperation({ summary: 'Get trending movies' })
  async getTrending(@Query('limit') limit = 20) {
    return this.moviesService.getTrending(Number(limit));
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently added movies' })
  async getRecent(@Query('limit') limit = 20) {
    return this.moviesService.getRecent(Number(limit));
  }

  @Get('genres')
  @ApiOperation({ summary: 'Get all genres' })
  async getGenres() {
    return this.moviesService.getGenres();
  }

  @Get('search')
  @ApiOperation({ summary: 'Search movies' })
  @ApiQuery({ name: 'q', required: true })
  async search(
    @Query('q') query: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.moviesService.search(query, Number(page), Number(limit));
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get personalised movie recommendations' })
  async getRecommended(@CurrentUser() user: AuthUser, @Query('limit') limit = 20) {
    return this.moviesService.getRecommended(user._id, Number(limit));
  }

  @Get('genre/:genre')
  @ApiOperation({ summary: 'Get movies by genre' })
  async getByGenre(
    @Param('genre') genre: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.moviesService.getByGenre(genre, Number(page), Number(limit));
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Get movie stream URL' })
  async getStreamUrl(@Param('id') id: string) {
    const streamUrl = await this.moviesService.getStreamUrl(id);
    return { streamUrl };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie details' })
  async getMovie(@Param('id') id: string) {
    return this.moviesService.getMovieById(id);
  }
}
