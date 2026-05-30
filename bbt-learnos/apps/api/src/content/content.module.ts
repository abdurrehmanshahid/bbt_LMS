import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { MlModule } from '../ml/ml.module';
import { ModerationModule } from '../moderation/moderation.module';
import { TrackModule } from '../track/track.module';

import { ContentController } from './content.controller';
import { ContentService } from './content.service';


@Module({
  imports: [
    MlModule,
    ModerationModule,
    AnalyticsModule,
    TrackModule,
    BullModule.registerQueue({ name: 'moderation' }),
  ],
  providers: [ContentService],
  controllers: [ContentController],
  exports: [ContentService],
})
export class ContentModule {}
