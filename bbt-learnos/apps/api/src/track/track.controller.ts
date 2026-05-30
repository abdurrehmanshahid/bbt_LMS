import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { TrackService } from './track.service';

@Controller()
@SkipThrottle()
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  // ─── Public endpoints ──────────────────────────────────────────────────────

  @Get('tracks')
  findAll() {
    return this.trackService.findAll();
  }

  @Get('tracks/:slug')
  findOne(@Param('slug') slug: string) {
    return this.trackService.findBySlug(slug);
  }

  @Get('tracks-by-id/:trackId/modules')
  getTrackModules(@Param('trackId') trackId: string) {
    return this.trackService.getPublicModules(trackId);
  }

  @Get('tracks-by-id/:trackId/modules/:moduleId/concepts')
  getModuleConcepts(@Param('moduleId') moduleId: string) {
    return this.trackService.getPublicConcepts(moduleId);
  }

  // ─── Learner endpoints ─────────────────────────────────────────────────────

  @Get('learner/dashboard')
  @UseGuards(JwtAuthGuard)
  getLearnerDashboard(@CurrentUser() user: JwtPayload) {
    return this.trackService.getLearnerDashboard(user.sub);
  }

  @Get('learner/courses')
  @UseGuards(JwtAuthGuard)
  getLearnerCourses(@CurrentUser() user: JwtPayload) {
    return this.trackService.getLearnerCourses(user.sub);
  }

  @Get('learner/track/:trackId/modules')
  @UseGuards(JwtAuthGuard)
  getModulesWithLockStatus(
    @Param('trackId') trackId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trackService.getEnrolledTrack(trackId, user.sub);
  }

  @Get('learner/track/:trackId/module/:moduleId')
  @UseGuards(JwtAuthGuard)
  getModuleDetail(
    @Param('trackId') trackId: string,
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trackService.getModuleDetail(trackId, moduleId, user.sub);
  }
}
