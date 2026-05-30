import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ModerationAiService } from './moderation-ai.service';
import { ModerationProcessor } from './moderation.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'moderation' }),
  ],
  providers: [ModerationAiService, ModerationProcessor],
  exports: [ModerationAiService],
})
export class ModerationModule {}
