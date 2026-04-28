import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ModerationAiService } from './moderation-ai.service';
import { NotificationService } from '../notification/notification.service';
import type { PushJobData } from '../notification/notification.types';

export interface ModerationJobData {
  contentId: string;
  creatorId: string;
  muxAssetId: string;
  s3Key?: string;
  transcript?: string;
}

@Processor('moderation')
export class ModerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ModerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: ModerationAiService,
    private readonly notifications: NotificationService,
  ) {
    super();
  }

  async process(job: Job<ModerationJobData>): Promise<void> {
    const { contentId, creatorId, muxAssetId, s3Key, transcript } = job.data;
    this.logger.log(`AI moderation start: contentId=${contentId}`);

    let result;
    try {
      result = await this.aiService.screenContent({
        muxAssetId,
        ...(s3Key ? { s3Key } : {}),
        ...(transcript ? { transcript } : {}),
      });
    } catch (err) {
      this.logger.error(`AI screen threw: ${(err as Error).message}`);
      result = { autoReject: false, flags: [], confidence: 0, rawRekognition: [], rawToxicity: [], sentiment: 'NEUTRAL' };
    }

    const aiFlags = {
      flags: result.flags,
      confidence: result.confidence,
      sentiment: result.sentiment,
      autoReject: result.autoReject,
    } as unknown as Prisma.InputJsonValue;

    if (result.autoReject) {
      // Auto-reject: update content + moderation record
      await this.prisma.$transaction([
        this.prisma.content.update({
          where: { id: contentId },
          data: { status: 'REJECTED' },
        }),
        this.prisma.moderationRecord.create({
          data: {
            contentId,
            decision: 'REJECTED',
            aiFlags,
            aiConfidence: result.confidence,
            feedbackJson: {
              reason: 'AUTO_REJECTED',
              categories: result.flags
                .filter((f) => f.confidence >= 0.8)
                .map((f) => f.category),
            },
          },
        }),
      ]);

      // Notify creator
      const push: PushJobData = {
        userId: creatorId,
        title: 'Your content was rejected',
        body: 'Our system detected policy violations in your upload. Please review our content guidelines and re-upload.',
        category: 'MODERATION',
        data: { contentId, reason: 'POLICY_VIOLATION' },
      };
      await this.notifications.sendPush(push);

      this.logger.warn(`Auto-rejected contentId=${contentId} flags=${result.flags.length}`);
    } else {
      // Add to human moderation queue
      await this.prisma.moderationRecord.create({
        data: {
          contentId,
          decision: 'PENDING',
          aiFlags,
          aiConfidence: result.confidence,
        },
      });

      this.logger.log(`Queued for human review: contentId=${contentId} confidence=${result.confidence.toFixed(2)}`);
    }
  }
}
