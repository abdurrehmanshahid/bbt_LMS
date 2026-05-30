import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { MentorshipService, CreateSlotDto } from './mentorship.service';

// ── Creator endpoints ────────────────────────────────────────────────────────

@Controller('creator/mentorship')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR', 'ADMIN')
export class CreatorMentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Post('slots')
  createSlot(@CurrentUser() user: JwtPayload, @Body() dto: CreateSlotDto) {
    return this.mentorshipService.createSlot(user.sub, dto);
  }

  @Get('slots')
  listSlots(@CurrentUser() user: JwtPayload) {
    return this.mentorshipService.listCreatorSlots(user.sub);
  }

  @Delete('slots/:slotId')
  @HttpCode(HttpStatus.OK)
  deleteSlot(@CurrentUser() user: JwtPayload, @Param('slotId') slotId: string) {
    return this.mentorshipService.deleteSlot(user.sub, slotId);
  }

  @Post('tier-upgrade')
  requestTierUpgrade(@CurrentUser() user: JwtPayload) {
    return this.mentorshipService.requestTierUpgrade(user.sub);
  }
}

// ── Learner endpoints ────────────────────────────────────────────────────────

@Controller('learner/mentorship')
@UseGuards(JwtAuthGuard)
export class LearnerMentorshipController {
  constructor(private readonly mentorshipService: MentorshipService) {}

  @Get('creators')
  listCreators(@Query('trackId') trackId?: string) {
    return this.mentorshipService.listAvailableCreators(trackId);
  }

  @Post('slots/:slotId/book')
  bookSlot(@CurrentUser() user: JwtPayload, @Param('slotId') slotId: string) {
    return this.mentorshipService.bookSlot(user.sub, slotId);
  }

  @Get('bookings')
  listBookings(@CurrentUser() user: JwtPayload) {
    return this.mentorshipService.listLearnerBookings(user.sub);
  }

  @Delete('bookings/:bookingId')
  @HttpCode(HttpStatus.OK)
  cancelBooking(@CurrentUser() user: JwtPayload, @Param('bookingId') bookingId: string) {
    return this.mentorshipService.cancelBooking(user.sub, bookingId);
  }
}
