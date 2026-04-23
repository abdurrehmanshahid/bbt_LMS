import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { TrackService } from './track.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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

  // ─── Learner endpoints ─────────────────────────────────────────────────────

  @Get('learner/track/:trackId/modules')
  @UseGuards(JwtAuthGuard)
  getModulesWithLockStatus(
    @Param('trackId') trackId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.trackService.getModulesWithLockStatus(trackId, user.sub);
  }
}
