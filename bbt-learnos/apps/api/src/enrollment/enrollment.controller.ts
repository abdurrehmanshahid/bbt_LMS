import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';
import { EnrollmentService } from './enrollment.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

class EnrollFreeDto {
  trackId!: string;
}

class CreateCheckoutDto {
  trackId!: string;
  plan!: 'MONTHLY' | 'ANNUAL';
}

@Controller()
@SkipThrottle()
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  // ─── Learner endpoints ───────────────────────────────────────────────────────

  @Get('learner/enrollments')
  @UseGuards(JwtAuthGuard)
  findByUser(@CurrentUser() user: JwtPayload) {
    return this.enrollmentService.findByUser(user.sub);
  }

  @Post('learner/enroll/free')
  @UseGuards(JwtAuthGuard)
  enrollFree(@CurrentUser() user: JwtPayload, @Body() dto: EnrollFreeDto) {
    return this.enrollmentService.enrollFree(user.sub, dto.trackId);
  }

  @Post('learner/enroll/checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.enrollmentService.createCheckoutSession(user.sub, dto.trackId, dto.plan);
  }

  @Delete('learner/enrollments/:trackId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: JwtPayload, @Param('trackId') trackId: string) {
    return this.enrollmentService.cancel(user.sub, trackId);
  }

  // ─── Stripe webhook ───────────────────────────────────────────────────────────

  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.enrollmentService.handleStripeWebhook(req.rawBody!, signature);
  }
}
