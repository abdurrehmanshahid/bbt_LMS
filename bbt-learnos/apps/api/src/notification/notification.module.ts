import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { PushProcessor } from './push.processor';
import { EmailProcessor } from './email.processor';
import { EmailModule } from '../email/email.module';
import { PUSH_QUEUE, EMAIL_QUEUE } from './notification.types';

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
