import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnrollmentPlan, EnrollmentStatus, UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEmail, IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { AdminService } from './admin.service';

class LaunchChallengeDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(2)
  hashtag!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsISO8601()
  startsAt?: string;

  @IsOptional()
  @IsISO8601()
  endsAt?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;
}

class EnrollUserDto {
  @IsString()
  trackId!: string;

  @IsOptional()
  @IsEnum(EnrollmentPlan)
  plan?: EnrollmentPlan;
}

class UpdateEnrollmentDto {
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsEnum(EnrollmentPlan)
  plan?: EnrollmentPlan;
}

class CreateCourseDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(3)
  slug!: string;

  @IsString()
  @MinLength(8)
  description!: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateCourseDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  description?: string;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateModuleDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsInt()
  @Min(1)
  estimatedMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

class UpdateModuleDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  passingScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateConceptDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisiteIds?: string[];
}

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

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() body: CreateUserDto) {
    return this.adminService.createUser(body);
  }

  @Get('users/:userId')
  getUserDetail(@Param('userId') userId: string) {
    return this.adminService.getUserDetail(userId);
  }

  @Patch('users/:userId')
  updateUser(@Param('userId') userId: string, @Body() body: UpdateUserDto) {
    return this.adminService.updateUser(userId, body);
  }

  @Post('users/:userId/enrollments')
  @HttpCode(HttpStatus.CREATED)
  enrollUser(@Param('userId') userId: string, @Body() body: EnrollUserDto) {
    return this.adminService.enrollUser(userId, body);
  }

  @Patch('users/:userId/enrollments/:trackId')
  updateEnrollment(
    @Param('userId') userId: string,
    @Param('trackId') trackId: string,
    @Body() body: UpdateEnrollmentDto,
  ) {
    return this.adminService.updateEnrollment(userId, trackId, body);
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

  // ─── Courses ───────────────────────────────────────────────────────────────

  @Get('courses')
  getCourses() {
    return this.adminService.getCourses();
  }

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  createCourse(@Body() body: CreateCourseDto) {
    return this.adminService.createCourse(body);
  }

  @Patch('courses/:trackId')
  updateCourse(@Param('trackId') trackId: string, @Body() body: UpdateCourseDto) {
    return this.adminService.updateCourse(trackId, body);
  }

  // ── Modules ──────────────────────────────────────────────────────────────────

  @Get('courses/:trackId/modules')
  getModules(@Param('trackId') trackId: string) {
    return this.adminService.getModules(trackId);
  }

  @Post('courses/:trackId/modules')
  @HttpCode(HttpStatus.CREATED)
  createModule(@Param('trackId') trackId: string, @Body() body: CreateModuleDto) {
    return this.adminService.createModule(trackId, body);
  }

  @Patch('courses/:trackId/modules/:moduleId')
  updateModule(
    @Param('trackId') trackId: string,
    @Param('moduleId') moduleId: string,
    @Body() body: UpdateModuleDto,
  ) {
    return this.adminService.updateModule(trackId, moduleId, body);
  }

  @Delete('courses/:trackId/modules/:moduleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteModule(@Param('trackId') trackId: string, @Param('moduleId') moduleId: string) {
    return this.adminService.deleteModule(trackId, moduleId);
  }

  // ── Concepts ─────────────────────────────────────────────────────────────────

  @Get('courses/:trackId/modules/:moduleId/concepts')
  getConcepts(@Param('moduleId') moduleId: string) {
    return this.adminService.getConcepts(moduleId);
  }

  @Post('courses/:trackId/modules/:moduleId/concepts')
  @HttpCode(HttpStatus.CREATED)
  createConcept(@Param('moduleId') moduleId: string, @Body() body: CreateConceptDto) {
    return this.adminService.createConcept(moduleId, body);
  }

  @Patch('courses/:trackId/modules/:moduleId/concepts/:conceptId')
  updateConcept(
    @Param('moduleId') moduleId: string,
    @Param('conceptId') conceptId: string,
    @Body() body: { title?: string; description?: string },
  ) {
    return this.adminService.updateConcept(moduleId, conceptId, body);
  }

  @Delete('courses/:trackId/modules/:moduleId/concepts/:conceptId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteConcept(@Param('moduleId') moduleId: string, @Param('conceptId') conceptId: string) {
    return this.adminService.deleteConcept(moduleId, conceptId);
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

  // â”€â”€ Challenges â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  @Post('challenges')
  @HttpCode(HttpStatus.CREATED)
  launchChallenge(@CurrentUser() admin: JwtPayload, @Body() body: LaunchChallengeDto) {
    return this.adminService.launchChallenge(admin.sub, body);
  }

  // ── Franchises ──────────────────────────────────────────────────────────────

  @Get('franchises')
  getFranchises() {
    return this.adminService.getFranchises();
  }

  // ── Analytics ───────────────────────────────────────────────────────────────

  @Get('analytics/content')
  getContentAnalytics(@Query('days') days?: string) {
    return this.adminService.getContentAnalytics(Math.min(90, Number(days ?? 7)));
  }

  @Get('analytics/engagement')
  getEngagementAnalytics(@Query('days') days?: string) {
    return this.adminService.getEngagementAnalytics(Math.min(90, Number(days ?? 30)));
  }

  // ── Comment moderation ──────────────────────────────────────────────────────

  @Get('comments/flagged')
  getFlaggedComments(@Query('cursor') cursor?: string) {
    return this.adminService.getFlaggedComments(cursor);
  }

  @Post('comments/:commentId/restore')
  @HttpCode(HttpStatus.OK)
  restoreComment(@Param('commentId') commentId: string) {
    return this.adminService.restoreComment(commentId);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  deleteComment(@Param('commentId') commentId: string) {
    return this.adminService.deleteCommentByAdmin(commentId);
  }
}
