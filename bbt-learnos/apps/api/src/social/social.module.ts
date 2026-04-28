import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import {
  SocialController,
  PublicCreatorController,
  LeaderboardController,
  ContentInteractionController,
} from './social.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [SocialController, PublicCreatorController, LeaderboardController, ContentInteractionController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
