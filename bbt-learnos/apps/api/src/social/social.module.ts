import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';

import { CommentModerationService } from './comment-moderation.service';
import {
  SocialController,
  PublicCreatorController,
  LeaderboardController,
  ContentInteractionController,
} from './social.controller';
import { SocialService } from './social.service';


@Module({
  imports: [NotificationModule],
  controllers: [SocialController, PublicCreatorController, LeaderboardController, ContentInteractionController],
  providers: [SocialService, CommentModerationService],
  exports: [SocialService],
})
export class SocialModule {}
