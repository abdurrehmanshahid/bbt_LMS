import { Module } from '@nestjs/common';
import { MentorshipService } from './mentorship.service';
import { CreatorMentorshipController, LearnerMentorshipController } from './mentorship.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [CreatorMentorshipController, LearnerMentorshipController],
  providers: [MentorshipService],
  exports: [MentorshipService],
})
export class MentorshipModule {}
