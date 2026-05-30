import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

import { NotificationService } from './notification.service';
import type { NotificationCategory } from './notification.types';

@Controller('learner/notifications')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  getInbox(@CurrentUser() user: JwtPayload, @Query('page') page?: string) {
    return this.notificationService.getInbox(user.sub, page ? parseInt(page, 10) : 1);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notificationService.markRead(user.sub, id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notificationService.markAllRead(user.sub);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getSettings(user.sub);
  }

  @Patch('settings')
  updateSettings(
    @CurrentUser() user: JwtPayload,
    @Body() body: Partial<Record<NotificationCategory, boolean>>,
  ) {
    return this.notificationService.updateSettings(user.sub, body);
  }
}
