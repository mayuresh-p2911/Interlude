import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  async getStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(Number(page), Number(limit), search);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update user (admin/block status)' })
  async updateUser(
    @Param('userId') userId: string,
    @Body() body: { isAdmin?: boolean; isBlocked?: boolean },
  ) {
    return this.adminService.updateUser(userId, body);
  }

  @Get('movies')
  @ApiOperation({ summary: 'List all movies in DB cache' })
  async getMovies(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getMovies(Number(page), Number(limit));
  }

  @Patch('movies/:movieId/toggle')
  @ApiOperation({ summary: 'Toggle movie active status' })
  async toggleMovie(@Param('movieId') movieId: string) {
    return this.adminService.toggleMovieStatus(movieId);
  }

  @Get('streaming-config')
  @ApiOperation({ summary: 'Get current streaming provider configuration' })
  async getStreamingConfig() {
    return this.adminService.getStreamingConfig();
  }
}
