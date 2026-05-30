import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';

import { CreatorMentorshipController, LearnerMentorshipController } from './mentorship.controller';
import { MentorshipService } from './mentorship.service';

@Module({
  imports: [NotificationModule],
  controllers: [CreatorMentorshipController, LearnerMentorshipController],
  providers: [MentorshipService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
