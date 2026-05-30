import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Headers,
  RawBodyRequest,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PayoutMethod } from '@prisma/client';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

import { PayoutService } from './payout.service';


class ProcessPayoutDto {
  @IsIn(['STRIPE_CONNECT', 'BANK_TRANSFER'])
  method!: 'STRIPE_CONNECT' | 'BANK_TRANSFER';

  @IsOptional()
  @IsString()
  bankRef?: string;
}

class AdminListPayoutsQuery {
  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'FAILED'])
  status?: string;

  @IsOptional()
  @IsString()
  page?: string;
}

@Controller()
@SkipThrottle()
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  // ─── Creator endpoints ───────────────────────────────────────────────────────

  @Get('creator/revenue')
  @UseGuards(JwtAuthGuard)
  getRevenue(@CurrentUser() user: JwtPayload) {
    return this.payoutService.getRevenue(user.sub);
  }

  @Post('creator/revenue/payout')
  @UseGuards(JwtAuthGuard)
  requestPayout(@CurrentUser() user: JwtPayload) {
    return this.payoutService.requestPayout(user.sub);
  }

  @Post('creator/connect/onboard')
  @UseGuards(JwtAuthGuard)
  onboardStripeConnect(@CurrentUser() user: JwtPayload) {
    return this.payoutService.onboardStripeConnect(user.sub);
  }

  @Get('creator/connect/status')
  @UseGuards(JwtAuthGuard)
  getConnectStatus(@CurrentUser() user: JwtPayload) {
    return this.payoutService.getConnectStatus(user.sub);
  }

  // ─── Stripe Connect webhook ──────────────────────────────────────────────────

  @Post('webhooks/stripe-connect')
  @HttpCode(HttpStatus.OK)
  handleConnectWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') sig: string,
  ) {
    return this.payoutService.handleConnectWebhook(req.rawBody!, sig);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  @Get('admin/payouts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminListPayouts(@Query() query: AdminListPayoutsQuery) {
    const page = query.page ? parseInt(query.page, 10) : 1;
    return this.payoutService.adminListPayouts(page, query.status);
  }

  @Post('admin/payouts/:id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  adminProcessPayout(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() body: ProcessPayoutDto,
  ) {
    return this.payoutService.adminProcessPayout(
      id,
      user.sub,
      body.method as PayoutMethod,
      body.bankRef,
    );
  }
}
