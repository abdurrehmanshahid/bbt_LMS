import {
  Controller, Get, Post, Delete, Param, Body, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';

import { SocialService } from './social.service';

// ── Public endpoints (no auth required) ─────────────────────────────────────

@Controller('creators')
@UseGuards(OptionalJwtGuard)
export class PublicCreatorController {
  constructor(private readonly socialService: SocialService) {}

  @Get('public-list')
  publicList() {
    return this.socialService.getPublicCreatorList();
  }

  @Get(':displayName/profile')
  getProfile(
    @Param('displayName') displayName: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.socialService.getPublicCreatorProfile(displayName, user?.sub);
  }
}

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly socialService: SocialService) {}

  @Get()
  getLeaderboard(
    @Query('trackId') trackId?: string,
    @Query('period') period?: 'week' | 'month' | 'all',
  ) {
    return this.socialService.getLeaderboard(trackId, period ?? 'month');
  }
}

// ── Authenticated endpoints ──────────────────────────────────────────────────

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // Follow
  @Post('creators/:creatorId/follow')
  follow(@CurrentUser() user: JwtPayload, @Param('creatorId') creatorId: string) {
    return this.socialService.follow(user.sub, creatorId);
  }

  @Delete('creators/:creatorId/follow')
  @HttpCode(HttpStatus.OK)
  unfollow(@CurrentUser() user: JwtPayload, @Param('creatorId') creatorId: string) {
    return this.socialService.unfollow(user.sub, creatorId);
  }

  @Get('creators/:creatorId/follow-stats')
  followStats(@Param('creatorId') creatorId: string) {
    return this.socialService.getFollowStats(creatorId);
  }

  // Social feed
  @Get('feed')
  socialFeed(@CurrentUser() user: JwtPayload, @Query('cursor') cursor?: string) {
    return this.socialService.getSocialFeed(user.sub, cursor);
  }
}

// ── Content comments + reactions ─────────────────────────────────────────────

@Controller('content/:contentId')
export class ContentInteractionController {
  constructor(private readonly socialService: SocialService) {}

  // Comments — GET is public
  @Get('comments')
  getComments(@Param('contentId') contentId: string, @Query('cursor') cursor?: string) {
    return this.socialService.getComments(contentId, cursor);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  addComment(
    @CurrentUser() user: JwtPayload,
    @Param('contentId') contentId: string,
    @Body() body: { body: string; parentId?: string },
  ) {
    return this.socialService.addComment(user.sub, contentId, body.body, body.parentId);
  }

  @Delete('comments/:commentId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  deleteComment(@CurrentUser() user: JwtPayload, @Param('commentId') commentId: string) {
    return this.socialService.deleteComment(user.sub, commentId);
  }

  @Post('comments/:commentId/report')
  @UseGuards(JwtAuthGuard)
  reportComment(
    @CurrentUser() user: JwtPayload,
    @Param('commentId') commentId: string,
    @Body() body: { reason: string },
  ) {
    return this.socialService.reportComment(user.sub, commentId, body.reason);
  }

  // Reactions
  @Post('react')
  @UseGuards(JwtAuthGuard)
  react(
    @CurrentUser() user: JwtPayload,
    @Param('contentId') contentId: string,
    @Body() body: { type: string },
  ) {
    return this.socialService.react(user.sub, contentId, body.type);
  }

  @Delete('react')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  unreact(@CurrentUser() user: JwtPayload, @Param('contentId') contentId: string) {
    return this.socialService.unreact(user.sub, contentId);
  }

  @Get('reactions')
  reactions(@Param('contentId') contentId: string) {
    return this.socialService.getReactionCounts(contentId);
  }
}
