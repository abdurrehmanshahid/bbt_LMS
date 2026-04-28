import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { MlModule } from '../ml/ml.module';
import { ModerationModule } from '../moderation/moderation.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    MlModule,
    ModerationModule,
    AnalyticsModule,
    BullModule.registerQueue({ name: 'moderation' }),
  ],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
