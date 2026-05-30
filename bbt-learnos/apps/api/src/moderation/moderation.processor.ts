import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Job } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';

import { ModerationAiService } from './moderation-ai.service';

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
  ) {
    super();
  }

  async process(job: Job<ModerationJobData>): Promise<void> {
    const { contentId, muxAssetId, s3Key, transcript } = job.data;
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
      result = { flags: [], confidence: 0, rawRekognition: [], rawToxicity: [], sentiment: 'NEUTRAL' };
    }

    const aiFlags = {
      flags: result.flags,
      confidence: result.confidence,
      sentiment: result.sentiment,
    } as unknown as Prisma.InputJsonValue;

    // AI flags only — all decisions are made by a human admin
    await this.prisma.moderationRecord.create({
      data: {
        contentId,
        decision: 'PENDING',
        aiFlags,
        aiConfidence: result.confidence,
      },
    });

    this.logger.log(`Queued for human review: contentId=${contentId} flags=${result.flags.length} confidence=${result.confidence.toFixed(2)}`);
  }
}
