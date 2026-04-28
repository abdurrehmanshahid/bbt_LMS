import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ModerationAiService } from './moderation-ai.service';
import { ModerationProcessor } from './moderation.processor';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'moderation' }),
    NotificationModule,
  ],
  providers: [ModerationAiService, ModerationProcessor],
  exports: [ModerationAiService],
})
export class ModerationModule {}
