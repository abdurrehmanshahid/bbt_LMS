import { Module } from '@nestjs/common';
import { LiveSessionService } from './live-session.service';
import { CreatorLiveSessionController, LearnerLiveSessionController } from './live-session.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [CreatorLiveSessionController, LearnerLiveSessionController],
  providers: [LiveSessionService],
  exports: [LiveSessionService],
})
export class LiveSessionModule {}
