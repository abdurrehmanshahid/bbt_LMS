import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Ip,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AssessmentService, SubmitAssessmentDto } from './assessment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('learner/modules/:moduleId/assessment')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class AssessmentController {
  constructor(private readonly assessmentService: AssessmentService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  startSession(@Param('moduleId') moduleId: string, @CurrentUser() user: JwtPayload) {
    return this.assessmentService.startSession(moduleId, user.sub);
  }

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(
    @Param('moduleId') moduleId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitAssessmentDto,
    @Ip() ip: string,
  ) {
    return this.assessmentService.submit(moduleId, user.sub, dto, ip);
  }

  @Get('status')
  getStatus(@Param('moduleId') moduleId: string, @CurrentUser() user: JwtPayload) {
    return this.assessmentService.getStatus(moduleId, user.sub);
  }
}
