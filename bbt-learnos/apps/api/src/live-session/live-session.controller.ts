import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LiveSessionService, CreateLiveSessionDto } from './live-session.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// ── Creator endpoints ────────────────────────────────────────────────────────

@Controller('creator/live-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR', 'ADMIN')
export class CreatorLiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  @Post()
  createSession(@CurrentUser() user: JwtPayload, @Body() dto: CreateLiveSessionDto) {
    return this.liveSessionService.createSession(user.sub, dto);
  }

  @Get()
  listSessions(@CurrentUser() user: JwtPayload) {
    return this.liveSessionService.listCreatorSessions(user.sub);
  }

  @Post(':sessionId/start')
  startSession(@CurrentUser() user: JwtPayload, @Param('sessionId') sessionId: string) {
    return this.liveSessionService.startSession(user.sub, sessionId);
  }

  @Post(':sessionId/end')
  @HttpCode(HttpStatus.OK)
  endSession(@CurrentUser() user: JwtPayload, @Param('sessionId') sessionId: string) {
    return this.liveSessionService.endSession(user.sub, sessionId);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.OK)
  cancelSession(@CurrentUser() user: JwtPayload, @Param('sessionId') sessionId: string) {
    return this.liveSessionService.cancelSession(user.sub, sessionId);
  }
}

// ── Learner endpoints ────────────────────────────────────────────────────────

@Controller('learner/live-sessions')
@UseGuards(JwtAuthGuard)
export class LearnerLiveSessionController {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  @Get()
  listUpcoming(@CurrentUser() user: JwtPayload) {
    return this.liveSessionService.listUpcomingSessions(user.sub);
  }

  @Get(':sessionId/join')
  joinSession(@CurrentUser() user: JwtPayload, @Param('sessionId') sessionId: string) {
    return this.liveSessionService.joinSession(user.sub, sessionId);
  }
}
