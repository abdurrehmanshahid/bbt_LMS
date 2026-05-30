import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { CohortService } from './cohort.service';

class CreateStudyGroupDto {
  memberIds!: string[];
}

class SetVisibilityDto {
  isVisible!: boolean;
}

@Controller('learner')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class CohortController {
  constructor(private readonly cohortService: CohortService) {}

  @Get('cohort')
  getMyCohort(@CurrentUser() user: JwtPayload) {
    return this.cohortService.getMyCohort(user.sub);
  }

  @Get('cohort/:cohortId/activity')
  getActivity(@Param('cohortId') cohortId: string, @CurrentUser() user: JwtPayload) {
    return this.cohortService.getCohortActivity(cohortId, user.sub);
  }

  @Post('cohort/study-group')
  @HttpCode(HttpStatus.CREATED)
  createStudyGroup(@CurrentUser() user: JwtPayload, @Body() dto: CreateStudyGroupDto) {
    return this.cohortService.createStudyGroup(user.sub, dto.memberIds);
  }

  @Patch('cohort/:cohortId/visibility')
  @HttpCode(HttpStatus.NO_CONTENT)
  setVisibility(
    @CurrentUser() user: JwtPayload,
    @Param('cohortId') cohortId: string,
    @Body() dto: SetVisibilityDto,
  ) {
    return this.cohortService.setVisibility(user.sub, cohortId, dto.isVisible);
  }
}
