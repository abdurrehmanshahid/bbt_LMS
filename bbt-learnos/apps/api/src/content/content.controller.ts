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
import { ContentType } from '@prisma/client';
import type { Request } from 'express';
import { ContentService, AnalyticsEventDto } from './content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

class CreateUploadDto {
  trackId!: string;
  moduleId?: string;
  conceptId?: string;
  title!: string;
  description!: string;
  type!: ContentType;
  tags?: string[];
}

@Controller()
@SkipThrottle()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // ─── Public ──────────────────────────────────────────────────────────────────

  @Get('content/:id')
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  // ─── Learner feed ─────────────────────────────────────────────────────────────

  @Get('learner/feed')
  @UseGuards(JwtAuthGuard)
  getFeed(@CurrentUser() user: JwtPayload, @Query('cursor') cursor?: string) {
    return this.contentService.getFeed(user.sub, cursor);
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  @Post('analytics/event')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  trackEvent(@CurrentUser() user: JwtPayload, @Body() dto: AnalyticsEventDto) {
    return this.contentService.trackEvent(user.sub, dto);
  }

  // ─── Creator ─────────────────────────────────────────────────────────────────

  @Post('creator/upload')
  @UseGuards(JwtAuthGuard)
  createUpload(@CurrentUser() user: JwtPayload, @Body() body: CreateUploadDto) {
    return this.contentService.createUpload(user, body);
  }

  // ─── Mux webhook (raw body) ──────────────────────────────────────────────────

  @Post('webhooks/mux')
  @HttpCode(HttpStatus.OK)
  handleMuxWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('mux-signature') signature: string,
  ) {
    return this.contentService.handleMuxWebhook(req.rawBody!, signature);
  }
}
