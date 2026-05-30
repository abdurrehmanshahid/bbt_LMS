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

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { EmployerService } from './employer.service';

@Controller('employer')
export class EmployerController {
  constructor(private readonly employerService: EmployerService) {}

  // ── Talent search (EMPLOYER only) ───────────────────────────────────────────

  @Get('talent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  searchTalent(
    @Query('track') track?: string,
    @Query('minBadgeScore') minBadgeScore?: string,
    @Query('country') country?: string,
    @Query('availability') availability?: string,
    @Query('after') after?: string,
  ) {
    return this.employerService.searchTalent({
      ...(track ? { track } : {}),
      ...(minBadgeScore ? { minBadgeScore: parseInt(minBadgeScore, 10) } : {}),
      ...(country ? { country } : {}),
      ...(availability ? { availability } : {}),
      ...(after ? { after } : {}),
    });
  }

  // ── Contact requests ────────────────────────────────────────────────────────

  @Post('contact-request/:learnerId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  @HttpCode(HttpStatus.CREATED)
  requestContact(
    @CurrentUser() user: JwtPayload,
    @Param('learnerId') learnerId: string,
    @Body() body: { message?: string },
  ) {
    return this.employerService.requestContact(
      user.sub,
      learnerId,
      ...(body.message ? [body.message] : []),
    );
  }

  @Get('referrals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  getReferrals(@CurrentUser() user: JwtPayload) {
    return this.employerService.getReferrals(user.sub);
  }

  // ── Opportunities ───────────────────────────────────────────────────────────

  @Post('opportunities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  @HttpCode(HttpStatus.CREATED)
  postOpportunity(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      title: string;
      description: string;
      track: string;
      location: string;
      isRemote: boolean;
      type: string;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      closingDate?: string;
      isFeatured?: boolean;
    },
  ) {
    return this.employerService.postOpportunity(user.sub, {
      title: body.title,
      description: body.description,
      track: body.track,
      location: body.location,
      isRemote: body.isRemote,
      type: body.type,
      ...(body.salaryMin !== undefined ? { salaryMin: body.salaryMin } : {}),
      ...(body.salaryMax !== undefined ? { salaryMax: body.salaryMax } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.closingDate ? { closingDate: body.closingDate } : {}),
      ...(body.isFeatured ? { isFeatured: body.isFeatured } : {}),
    });
  }

  @Get('opportunities')
  getOpportunities(
    @Query('track') track?: string,
    @Query('type') type?: string,
    @Query('approved') approved?: string,
  ) {
    return this.employerService.getOpportunities({
      ...(track ? { track } : {}),
      ...(type ? { type } : {}),
      ...(approved !== undefined ? { approved: approved === 'true' } : {}),
    });
  }

  // ── Staff augmentation ──────────────────────────────────────────────────────

  @Post('staff-aug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  @HttpCode(HttpStatus.CREATED)
  submitStaffAug(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      skills: string[];
      duration: string;
      startDate: string;
      maxHourlyBudget: number;
      currency?: string;
      notes?: string;
    },
  ) {
    return this.employerService.submitStaffAug(user.sub, {
      skills: body.skills,
      duration: body.duration,
      startDate: body.startDate,
      maxHourlyBudget: body.maxHourlyBudget,
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.notes ? { notes: body.notes } : {}),
    });
  }

  @Get('staff-aug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  getStaffAugRequests(@CurrentUser() user: JwtPayload) {
    return this.employerService.getStaffAugRequests(user.sub);
  }

  // ── Hire-a-Team ─────────────────────────────────────────────────────────────

  @Post('hire-team')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('EMPLOYER')
  @HttpCode(HttpStatus.CREATED)
  submitHireTeam(
    @CurrentUser() user: JwtPayload,
    @Body()
    body: {
      roles: Array<{ role: string; skills: string[]; seniority: string }>;
      notes?: string;
    },
  ) {
    return this.employerService.submitHireTeam(user.sub, {
      roles: body.roles,
      ...(body.notes ? { notes: body.notes } : {}),
    });
  }
}

// ── Public badge verification (no auth) ──────────────────────────────────────

@Controller('badges')
export class BadgeVerifyController {
  constructor(private readonly employerService: EmployerService) {}

  @Get(':id/verify')
  verifyBadge(@Param('id') id: string) {
    return this.employerService.verifyBadge(id);
  }
}
