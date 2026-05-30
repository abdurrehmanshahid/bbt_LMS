import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { EmailModule } from '../email/email.module';

import { EmailProcessor } from './email.processor';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PUSH_QUEUE, EMAIL_QUEUE } from './notification.types';
import { PushProcessor } from './push.processor';


@Module({
  imports: [
    BullModule.registerQueue({ name: PUSH_QUEUE }),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    EmailModule,
  ],
  providers: [NotificationService, PushProcessor, EmailProcessor],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
