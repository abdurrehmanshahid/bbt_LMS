import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';

import { CreatorLiveSessionController, LearnerLiveSessionController } from './live-session.controller';
import { LiveSessionService } from './live-session.service';

@Module({
  imports: [NotificationModule],
  controllers: [CreatorLiveSessionController, LearnerLiveSessionController],
  providers: [LiveSessionService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {}
