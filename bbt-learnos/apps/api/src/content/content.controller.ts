import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ContentType, UserRole } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TrackService } from '../track/track.service';

import { ContentService, type AnalyticsEventDto, type CreatorDashboardDto, type ReelAnalyticsEventDto } from './content.service';

class CreateUploadDto {
  @IsString()
  trackId!: string;

  @IsOptional()
  @IsString()
  moduleId?: string;

  @IsOptional()
  @IsString()
  conceptId?: string;

  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ContentType)
  type!: ContentType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  quickReel?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
  durationSeconds?: number;
}

class CreateCreatorCourseDto {
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
}

class FeedQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string;
}

class AnalyticsEventBodyDto implements AnalyticsEventDto {
  @IsString()
  contentId!: string;

  @IsIn(['play', 'pause', 'complete', 'seek', 'share', 'save'])
  event!: AnalyticsEventDto['event'];

  @IsOptional()
  @IsInt()
  @Min(0)
  positionSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

class ReelAnalyticsEventBodyDto implements ReelAnalyticsEventDto {
  @IsString()
  contentId!: string;

  @IsIn(['reel_view', 'reel_complete', 'reel_share'])
  event!: ReelAnalyticsEventDto['event'];

  @IsOptional()
  @IsInt()
  @Min(0)
  positionSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}

@Controller()
@SkipThrottle()
export class ContentController {
  constructor(
    private readonly contentService: ContentService,
    private readonly trackService: TrackService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  @Get('content/:id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Get('content/:contentId/playback-url')
  @UseGuards(JwtAuthGuard)
  getPlaybackUrl(
    @Param('contentId') contentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trackService.authorizePlayback(contentId, user.sub);
  }

  @Get('feed/shorts')
  getShortsFeed(@Query() query: FeedQueryDto) {
    return this.contentService.getShortsFeed(query.cursor);
  }

  @Get('trending')
  getTrendingTags() {
    return this.contentService.getTrendingTags();
  }

  @Get('tags/:slug')
  getTaggedReels(@Param('slug') slug: string, @Query() query: FeedQueryDto) {
    return this.contentService.getTaggedReels(slug, query.cursor);
  }

  // ─── Learner feed ─────────────────────────────────────────────────────────────

  @Get('learner/feed')
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser() user: JwtPayload, @Query('cursor') cursor?: string) {
    return this.contentService.getFeed(user.sub, cursor);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  @Post('analytics/event')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  trackEvent(@CurrentUser() user: JwtPayload, @Body() dto: AnalyticsEventBodyDto) {
    return this.contentService.trackEvent(user.sub, dto);
  }

  @Post('analytics/reel-event')
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  trackReelEvent(@CurrentUser() user: JwtPayload | null, @Body() dto: ReelAnalyticsEventBodyDto) {
    return this.contentService.trackReelEvent(user?.sub ?? null, dto);
  }

  // ─── Creator ─────────────────────────────────────────────────────────────────

  @Get('creator/dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  getCreatorDashboard(@CurrentUser() user: JwtPayload): Promise<CreatorDashboardDto> {
    return this.contentService.getCreatorDashboard(user);
  }

  @Get('creator/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  getCreatorCourses(@CurrentUser() user: JwtPayload) {
    return this.contentService.getCreatorCourses(user);
  }

  @Post('creator/courses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CREATOR, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  createCreatorCourse(@CurrentUser() user: JwtPayload, @Body() body: CreateCreatorCourseDto) {
    return this.contentService.createCreatorCourse(user, body);
  }

  @Post('creator/upload')
  @UseGuards(JwtAuthGuard)
  createUpload(@CurrentUser() user: JwtPayload, @Body() body: CreateUploadDto) {
    return this.contentService.createUpload(user, body);
  }

  @Get('creator/hashtag-suggestions')
  @UseGuards(JwtAuthGuard)
  getHashtagSuggestions(@Query('trackId') trackId?: string) {
    return this.contentService.suggestHashtags(trackId);
  }

  // ─── Mux webhook (raw body) ──────────────────────────────────────────────────

  @Post('webhooks/mux')
  @HttpCode(HttpStatus.OK)
  handleMuxWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('mux-signature') signature: string,
  ) {
    return this.contentService.handleMuxWebhook(req.rawBody!, signature);
  }
}
