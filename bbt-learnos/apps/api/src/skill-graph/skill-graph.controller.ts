import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { SkillGraphService } from './skill-graph.service';

@Controller()
@SkipThrottle()
export class SkillGraphController {
  constructor(private readonly skillGraph: SkillGraphService) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  @Get('skill-graph/concepts/:id/chain')
  getPrerequisiteChain(@Param('id') id: string) {
    return this.skillGraph.getPrerequisiteChain(id);
  }

  @Get('skill-graph/concepts/:id/unlocks')
  getUnlockedBy(@Param('id') id: string) {
    return this.skillGraph.getUnlockedBy(id);
  }

  @Get('skill-graph/tracks/:trackId')
  getConceptGraph(@Param('trackId') trackId: string) {
    return this.skillGraph.getConceptGraph(trackId);
  }

  // ─── JWT required ──────────────────────────────────────────────────────────

  @Get('skill-graph/path')
  @UseGuards(JwtAuthGuard)
  getSkillPath(@Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException({ code: 'MISSING_PARAMS', message: 'from and to query params required' });
    }
    return this.skillGraph.getSkillPath(from, to);
  }

  // ─── Learner ──────────────────────────────────────────────────────────────

  @Get('learner/skill-graph/ready')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('LEARNER', 'ADMIN')
  getReadyToLearn(@CurrentUser() user: JwtPayload) {
    return this.skillGraph.getReadyToLearn(user.sub);
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  @Post('admin/skill-graph/sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  syncFromPostgres() {
    return this.skillGraph.syncFromPostgres();
  }
}
