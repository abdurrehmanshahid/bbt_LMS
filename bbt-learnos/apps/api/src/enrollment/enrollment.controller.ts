import {
  Controller,
  Get,
  Post,
  Delete,
  All,
  Param,
  Body,
  Headers,
  RawBodyRequest,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { IsIn, IsOptional, IsString, IsUUID, Matches } from 'class-validator';
import type { Request, Response } from 'express';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { EnrollmentService } from './enrollment.service';

class EnrollFreeDto {
  @IsUUID()
  trackId!: string;
}

class CreateCheckoutDto {
  @IsUUID()
  trackId!: string;

  @IsIn(['MONTHLY', 'ANNUAL'])
  plan!: 'MONTHLY' | 'ANNUAL';
}

class CreateEasyPaisaCheckoutDto extends CreateCheckoutDto {
  @IsIn(['MA', 'OTC'])
  method!: 'MA' | 'OTC';

  @IsOptional()
  @IsString()
  @Matches(/^03[0-9]{9}$/)
  mobileNumber?: string;
}

type GatewayRequest = Request<
  Record<string, string>,
  unknown,
  Record<string, unknown>,
  Record<string, unknown>
>;

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

  @Post('learner/enroll/jazzcash')
  @UseGuards(JwtAuthGuard)
  createJazzCashCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateCheckoutDto) {
    return this.enrollmentService.createJazzCashCheckout(user.sub, dto.trackId, dto.plan);
  }

  @Post('learner/enroll/easypaisa')
  @UseGuards(JwtAuthGuard)
  createEasyPaisaCheckout(@CurrentUser() user: JwtPayload, @Body() dto: CreateEasyPaisaCheckoutDto) {
    return this.enrollmentService.createEasyPaisaCheckout(
      user.sub,
      dto.trackId,
      dto.plan,
      dto.method,
      dto.mobileNumber,
    );
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

  @All('payments/jazzcash/return')
  async handleJazzCashReturn(
    @Req() req: GatewayRequest,
    @Res() response: Response,
  ) {
    const result = await this.enrollmentService.handleJazzCashReturn(
      this.toStringRecord({ ...req.query, ...req.body }),
    );
    return response.redirect(result.redirectUrl);
  }

  @Post('webhooks/easypaisa')
  @HttpCode(HttpStatus.OK)
  handleEasyPaisaWebhook(@Req() req: GatewayRequest) {
    return this.enrollmentService.handleEasyPaisaWebhook(this.toStringRecord(req.body));
  }

  private toStringRecord(input: Record<string, unknown>): Record<string, string | undefined> {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value : undefined]),
    );
  }
}
