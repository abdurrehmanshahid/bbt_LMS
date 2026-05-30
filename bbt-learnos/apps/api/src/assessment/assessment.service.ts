import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const SESSION_TTL = 3600; // 1 hour max per attempt

export interface SubmitAssessmentDto {
  answers: Record<string, string>; // questionId → chosenOptionId
  sessionStartedAt: string; // ISO timestamp from client (validated against Redis)
}

export interface Question {
  id: string;
  text: string;
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
}

@Injectable()
export class AssessmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Start session ───────────────────────────────────────────────────────────

  async startSession(moduleId: string, userId: string): Promise<{ sessionKey: string; startedAt: string }> {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, questions: true },
    });
    if (!mod) throw new NotFoundException('Module not found');
    if (!mod.questions) throw new BadRequestException('No questions configured for this module');

    const sessionKey = `assessment:session:${userId}:${moduleId}`;
    const startedAt = new Date().toISOString();

    await this.redis.set(sessionKey, startedAt, 'EX', SESSION_TTL);

    return { sessionKey, startedAt };
  }

  // ─── Submit & grade ──────────────────────────────────────────────────────────

  async submit(
    moduleId: string,
    userId: string,
    dto: SubmitAssessmentDto,
    _clientIp: string,
  ) {
    const mod = await this.prisma.module.findUnique({
      where: { id: moduleId },
      select: { id: true, questions: true, passingScore: true, trackId: true },
    });
    if (!mod) throw new NotFoundException('Module not found');
    if (!mod.questions) throw new BadRequestException('Module has no questions');

    const questions = mod.questions as unknown as Question[];

    // Validate session exists in Redis
    const sessionKey = `assessment:session:${userId}:${moduleId}`;
    const sessionStart = await this.redis.get(sessionKey);
    if (!sessionStart) {
      throw new ForbiddenException('No active session found. Call startSession first.');
    }

    const startedAt = new Date(sessionStart);
    const submittedAt = new Date();
    const durationSeconds = Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000);

    // Grade
    let correct = 0;
    for (const q of questions) {
      if (dto.answers[q.id] === q.correctOptionId) correct++;
    }
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    const passed = score >= mod.passingScore;

    // Timing anomaly detection
    const minExpectedSeconds = questions.length * 10; // 10s per question minimum
    const flaggedForReview = durationSeconds < minExpectedSeconds;

    // Determine attempt number
    const prevAttempts = await this.prisma.assessment.count({
      where: { learnerId: userId, moduleId },
    });

    const assessment = await this.prisma.assessment.create({
      data: {
        learnerId: userId,
        moduleId,
        attemptNumber: prevAttempts + 1,
        score,
        passed,
        submittedAt,
        answers: dto.answers,
        flaggedForReview,
        reviewReason: flaggedForReview
          ? `Submission duration ${durationSeconds}s below minimum ${minExpectedSeconds}s`
          : null,
        sessionStartedAt: startedAt,
        submissionDuration: durationSeconds,
      },
    });

    // Clean up session
    await this.redis.del(sessionKey);

    // Issue badge and emit event if passed
    if (passed) {
      await this.issueBadgesForModule(moduleId, userId, score);
      this.eventEmitter.emit('assessment.passed', { userId, moduleId, score });
    }

    return { assessmentId: assessment.id, score, passed, flaggedForReview };
  }

  // ─── Badge issuance ──────────────────────────────────────────────────────────

  private async issueBadgesForModule(moduleId: string, userId: string, score: number): Promise<void> {
    const concepts = await this.prisma.concept.findMany({
      where: { moduleId },
      select: { id: true, title: true, module: { select: { title: true, track: { select: { title: true } } } } },
    });

    const issuedAt = new Date();

    for (const concept of concepts) {
      // Upsert — if badge already exists (previously revoked or issued), update
      await this.prisma.skillBadge.upsert({
        where: { learnerId_conceptId: { learnerId: userId, conceptId: concept.id } },
        create: {
          learnerId: userId,
          conceptId: concept.id,
          score,
          issuedAt,
          isRevoked: false,
          verificationUrl: `https://bbt.edu.pk/badges/${userId}/${concept.id}`,
          badgeJson: this.buildBadgeJson(userId, concept, score, issuedAt),
        },
        update: {
          score,
          issuedAt,
          isRevoked: false,
          verificationUrl: `https://bbt.edu.pk/badges/${userId}/${concept.id}`,
          badgeJson: this.buildBadgeJson(userId, concept, score, issuedAt),
        },
      });
    }
  }

  private buildBadgeJson(
    userId: string,
    concept: { id: string; title: string; module: { title: string; track: { title: string } } },
    score: number,
    issuedAt: Date,
  ) {
    return {
      '@context': ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'],
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: {
        id: 'https://bbt.edu.pk',
        type: 'Profile',
        name: 'Big Binary Tech',
        url: 'https://bbt.edu.pk',
      },
      issuanceDate: issuedAt.toISOString(),
      credentialSubject: {
        id: `https://bbt.edu.pk/learners/${userId}`,
        type: 'AchievementSubject',
        achievement: {
          id: `https://bbt.edu.pk/badges/concepts/${concept.id}`,
          type: 'Achievement',
          name: concept.title,
          description: `Demonstrated mastery of ${concept.title} within ${concept.module.title} (${concept.module.track.title})`,
          criteria: { narrative: `Score ≥ passing threshold. Achieved: ${score.toFixed(1)}%` },
          image: { id: `https://bbt.edu.pk/badge-images/${concept.id}.png`, type: 'Image' },
        },
      },
    };
  }

  // ─── Status ──────────────────────────────────────────────────────────────────

  async getStatus(moduleId: string, userId: string) {
    const assessments = await this.prisma.assessment.findMany({
      where: { learnerId: userId, moduleId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        attemptNumber: true,
        score: true,
        passed: true,
        submittedAt: true,
        flaggedForReview: true,
      },
    });

    const passed = assessments.some((a) => a.passed);
    const badges = passed
      ? await this.prisma.skillBadge.findMany({
          where: {
            learnerId: userId,
            concept: { moduleId },
            isRevoked: false,
          },
          select: {
            id: true,
            score: true,
            issuedAt: true,
            verificationUrl: true,
            concept: { select: { id: true, title: true } },
          },
        })
      : [];

    return { passed, attempts: assessments, badges };
  }
}
