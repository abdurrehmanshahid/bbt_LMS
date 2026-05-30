import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';

import { LtiService } from './lti.service';

@Injectable()
export class LtiListener {
  private readonly logger = new Logger(LtiListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lti: LtiService,
  ) {}

  @OnEvent('assessment.passed')
  async handleAssessmentPassed(payload: { userId: string; moduleId: string; score: number }) {
    // Find the most recent LTI launch for this learner that has a lineitem URL
    const launch = await this.prisma.ltiLaunch.findFirst({
      where: {
        learnerId: payload.userId,
        lineItemUrl: { not: null },
      },
      orderBy: { launchedAt: 'desc' },
    });

    if (!launch?.lineItemUrl) return;

    try {
      await this.lti.postScore(launch.lineItemUrl, launch.platformId, {
        userId: payload.userId,
        scoreGiven: payload.score,
        scoreMaximum: 1.0,
        timestamp: new Date().toISOString(),
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
      });
    } catch (err) {
      // Grade passback failures must never break the assessment flow
      this.logger.warn(`AGS grade passback failed: ${(err as Error).message}`);
    }
  }
}
