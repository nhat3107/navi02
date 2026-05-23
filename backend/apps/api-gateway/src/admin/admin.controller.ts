import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewAdminReportDto } from './dto/review-admin-report.dto';
import { BlockUserDto, CreateAdminUserDto, UpdateAiConfigDto } from './dto/admin-user.dto';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @HttpCode(HttpStatus.OK)
  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @HttpCode(HttpStatus.OK)
  @Get('users')
  getUsers(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.adminService.getUsers(limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Get('admins')
  getAdmins() {
    return this.adminService.getAdmins();
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('admins')
  createAdminUser(@Body() dto: CreateAdminUserDto) {
    return this.adminService.createAdminUser(dto.email, dto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('users/:id/block')
  blockUser(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.adminService.blockUser(id, dto.blockedUntil, dto.blockDays);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('users/:id/unblock')
  unblockUser(@Param('id') id: string) {
    return this.adminService.unblockUser(id);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('users/:id/reset-penalty')
  resetViolationPenalty(@Param('id') id: string) {
    return this.adminService.resetViolationPenalty(id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('ai/config')
  getAiConfig() {
    return this.adminService.getAiConfig();
  }

  @HttpCode(HttpStatus.OK)
  @Patch('ai/config')
  updateAiConfig(@Body() dto: UpdateAiConfigDto) {
    return this.adminService.updateAiConfig(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Get('posts/pending')
  getPendingPosts(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.adminService.getPendingPosts(limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Get('posts/reported')
  getReportedPosts(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
  ) {
    return this.adminService.getReportedPosts(limit, skip);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('posts/:id/approve')
  approvePost(@Param('id') id: string) {
    return this.adminService.approvePost(id);
  }

  @HttpCode(HttpStatus.OK)
  @Delete('posts/:id')
  rejectPost(@Param('id') id: string) {
    return this.adminService.rejectPost(id);
  }

  @HttpCode(HttpStatus.OK)
  @Get('reports')
  getReports(
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('skip', new ParseIntPipe({ optional: true })) skip?: number,
    @Query('status') status?: string,
  ) {
    return this.adminService.getReports(limit, skip, status);
  }

  @HttpCode(HttpStatus.OK)
  @Patch('reports/:id/review')
  async reviewReport(
    @Param('id') id: string,
    @Body() dto: ReviewAdminReportDto,
    @CurrentUser('sub') reviewerId: string,
  ) {
    return firstValueFrom(
      this.adminService.reviewReport(id, reviewerId, dto.action),
    );
  }
}
