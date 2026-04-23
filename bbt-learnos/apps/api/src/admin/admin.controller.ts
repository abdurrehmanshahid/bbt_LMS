import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Moderation ──────────────────────────────────────────────────────────────

  @Get('moderation')
  getModerationQueue() {
    return this.adminService.getModerationQueue();
  }

  @Post('moderation/:contentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  moderate(
    @CurrentUser() user: JwtPayload,
    @Param('contentId') contentId: string,
    @Body()
    body: {
      decision: 'APPROVED' | 'HELD' | 'REJECTED';
      reason?: string;
      feedback?: string;
      timestampRef?: string;
    },
  ) {
    return this.adminService.moderate(user.sub, contentId, {
      decision: body.decision,
      ...(body.reason ? { reason: body.reason } : {}),
      ...(body.feedback ? { feedback: body.feedback } : {}),
      ...(body.timestampRef ? { timestampRef: body.timestampRef } : {}),
    });
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  @Get('health')
  getHealth() {
    return this.adminService.getHealth();
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getUsers({
      ...(search ? { search } : {}),
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(page ? { page } : {}),
      ...(limit ? { limit } : {}),
    });
  }

  @Get('users/:userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Post('users/:userId/action')
  @HttpCode(HttpStatus.NO_CONTENT)
  userAction(
    @CurrentUser() admin: JwtPayload,
    @Param('userId') userId: string,
    @Body() body: { action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE'; days?: number; reason?: string },
  ) {
    return this.adminService.userAction(admin.sub, userId, body);
  }

  // ── Tier review ─────────────────────────────────────────────────────────────

  @Get('creators/tier-review')
  getTierReviewQueue() {
    return this.adminService.getTierReviewQueue();
  }

  @Post('creators/:creatorId/tier-decision')
  @HttpCode(HttpStatus.NO_CONTENT)
  decideTier(
    @CurrentUser() admin: JwtPayload,
    @Param('creatorId') creatorId: string,
    @Body() body: { decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE'; reason?: string },
  ) {
    return this.adminService.decideTier(admin.sub, creatorId, body.decision, body.reason);
  }

  // ── Gaps ────────────────────────────────────────────────────────────────────

  @Get('gaps')
  getGaps() {
    return this.adminService.getGaps();
  }

  // ── Franchises ──────────────────────────────────────────────────────────────

  @Get('franchises')
  getFranchises() {
    return this.adminService.getFranchises();
  }
}
