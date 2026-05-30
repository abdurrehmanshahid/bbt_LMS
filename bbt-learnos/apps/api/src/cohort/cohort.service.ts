import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CohortStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { CohortGateway } from './cohort.gateway';

const MAX_COHORT_SIZE = 20;
const MIN_VIABLE_MEMBERS = 3;
const MERGE_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h in ms
const MAX_STUDY_GROUP_SIZE = 6;

export interface EnrollmentCreatedEvent {
  userId: string;
  trackId: string;
  moduleStartIndex?: number;
}

@Injectable()
export class CohortService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: CohortGateway,
  ) {}

  // ─── Auto-assignment on enrollment ──────────────────────────────────────────

  @OnEvent('enrollment.created')
  async handleEnrollmentCreated(event: EnrollmentCreatedEvent): Promise<void> {
    await this.assignToCohort(event.userId, event.trackId, event.moduleStartIndex ?? 0);
  }

  async assignToCohort(userId: string, trackId: string, moduleStartIndex: number): Promise<void> {
    // Check if learner already in a cohort for this track
    const existingMembership = await this.prisma.cohortMember.findFirst({
      where: {
        learnerId: userId,
        cohort: { trackId, status: CohortStatus.ACTIVE },
      },
    });
    if (existingMembership) return;

    // Find an active cohort with available space at the same moduleStartIndex
    const availableCohort = await this.prisma.cohort.findFirst({
      where: {
        trackId,
        status: CohortStatus.ACTIVE,
        moduleStartIndex,
        members: { none: {} }, // will filter by count below
      },
      include: { _count: { select: { members: true } } },
    });

    // Re-check with count (Prisma doesn't support having-style filter on _count directly)
    let cohortId: string;
    if (availableCohort && availableCohort._count.members < MAX_COHORT_SIZE) {
      cohortId = availableCohort.id;
    } else {
      // Find any cohort with room
      const openCohort = await this.prisma.cohort.findFirst({
        where: { trackId, status: CohortStatus.ACTIVE, moduleStartIndex },
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (openCohort && openCohort._count.members < MAX_COHORT_SIZE) {
        cohortId = openCohort.id;
      } else {
        // Create new cohort
        const newCohort = await this.prisma.cohort.create({
          data: {
            trackId,
            name: `Cohort ${Date.now()}`,
            startDate: new Date(),
            maxSize: MAX_COHORT_SIZE,
            status: CohortStatus.ACTIVE,
            moduleStartIndex,
          },
        });
        cohortId = newCohort.id;
      }
    }

    await this.prisma.cohortMember.create({
      data: { cohortId, learnerId: userId },
    });

    // Notify cohort of new member
    this.gateway.emitNewMember(cohortId, userId);
  }

  // ─── Get learner's cohort ────────────────────────────────────────────────────

  async getMyCohort(userId: string) {
    const membership = await this.prisma.cohortMember.findFirst({
      where: { learnerId: userId, cohort: { status: CohortStatus.ACTIVE } },
      include: {
        cohort: {
          include: {
            members: {
              where: { isVisible: true },
              include: {
                learner: {
                  select: {
                    id: true,
                    name: true,
                    avatarUrl: true,
                    learnerProfile: {
                      select: { streakDays: true, currentModuleId: true },
                    },
                  },
                },
              },
            },
            _count: { select: { members: true } },
          },
        },
      },
    });

    if (!membership) return null;

    return {
      cohortId: membership.cohortId,
      memberCount: membership.cohort._count.members,
      visibleMembers: membership.cohort.members.map((m) => ({
        id: m.learner.id,
        name: m.learner.name,
        avatarUrl: m.learner.avatarUrl,
        streakDays: m.learner.learnerProfile?.streakDays ?? 0,
        currentModuleId: m.learner.learnerProfile?.currentModuleId ?? null,
      })),
      isVisible: membership.isVisible,
    };
  }

  // ─── Cohort activity feed ─────────────────────────────────────────────────────

  async getCohortActivity(cohortId: string, userId: string) {
    // Verify requester is a member
    const membership = await this.prisma.cohortMember.findUnique({
      where: { cohortId_learnerId: { cohortId, learnerId: userId } },
    });
    if (!membership) throw new ForbiddenException('Not a member of this cohort');

    // Get recent assessments (passed modules) from cohort members
    const cohort = await this.prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { members: { select: { learnerId: true } } },
    });
    if (!cohort) throw new NotFoundException('Cohort not found');

    const memberIds = cohort.members.map((m) => m.learnerId);

    const recentAssessments = await this.prisma.assessment.findMany({
      where: {
        learnerId: { in: memberIds },
        passed: true,
        submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { submittedAt: 'desc' },
      take: 50,
      select: {
        learnerId: true,
        moduleId: true,
        score: true,
        submittedAt: true,
        learner: { select: { name: true, avatarUrl: true } },
        module: { select: { title: true, order: true } },
      },
    });

    return recentAssessments.map((a) => ({
      type: 'MODULE_COMPLETED' as const,
      learnerId: a.learnerId,
      learnerName: a.learner.name,
      learnerAvatar: a.learner.avatarUrl,
      moduleTitle: a.module.title,
      moduleOrder: a.module.order,
      score: a.score,
      at: a.submittedAt,
    }));
  }

  // ─── Study group ─────────────────────────────────────────────────────────────

  async createStudyGroup(userId: string, memberIds: string[]): Promise<{ groupId: string }> {
    // Validate: all members in same track
    const userCohort = await this.prisma.cohortMember.findFirst({
      where: { learnerId: userId, cohort: { status: CohortStatus.ACTIVE } },
      include: { cohort: { select: { trackId: true } } },
    });
    if (!userCohort) throw new ForbiddenException('You must be in an active cohort to create a study group');

    const allIds = [...new Set([userId, ...memberIds])].slice(0, MAX_STUDY_GROUP_SIZE);

    // Create as a new cohort with ACTIVE status (study group = small cohort)
    const group = await this.prisma.cohort.create({
      data: {
        trackId: userCohort.cohort.trackId,
        name: `Study Group — ${new Date().toLocaleDateString()}`,
        startDate: new Date(),
        maxSize: MAX_STUDY_GROUP_SIZE,
        status: CohortStatus.ACTIVE,
        moduleStartIndex: 0,
        members: {
          createMany: {
            data: allIds.map((id) => ({ learnerId: id })),
          },
        },
      },
    });

    return { groupId: group.id };
  }

  // ─── Toggle visibility ────────────────────────────────────────────────────────

  async setVisibility(userId: string, cohortId: string, isVisible: boolean): Promise<void> {
    await this.prisma.cohortMember.update({
      where: { cohortId_learnerId: { cohortId, learnerId: userId } },
      data: { isVisible },
    });
  }

  // ─── Broadcast module completion to cohort ───────────────────────────────────

  @OnEvent('assessment.passed')
  async handleAssessmentPassed(event: { userId: string; moduleId: string; score: number }): Promise<void> {
    const membership = await this.prisma.cohortMember.findFirst({
      where: { learnerId: event.userId, isVisible: true, cohort: { status: CohortStatus.ACTIVE } },
      select: { cohortId: true },
    });
    if (!membership) return;

    const mod = await this.prisma.module.findUnique({
      where: { id: event.moduleId },
      select: { title: true, order: true },
    });
    if (!mod) return;

    this.gateway.emitMemberProgress(membership.cohortId, {
      userId: event.userId,
      moduleTitle: mod.title,
      moduleOrder: mod.order,
      score: event.score,
    });
  }

  // ─── Merge under-populated cohorts (scheduled) ───────────────────────────────

  @Cron(CronExpression.EVERY_12_HOURS)
  async mergeUnderPopulatedCohorts(): Promise<void> {
    const cutoff = new Date(Date.now() - MERGE_WINDOW_MS);

    const smallCohorts = await this.prisma.cohort.findMany({
      where: {
        status: CohortStatus.ACTIVE,
        createdAt: { lt: cutoff },
        members: { none: {} },
      },
      include: { _count: { select: { members: true } }, members: { select: { learnerId: true } } },
    });

    const actuallySmall = smallCohorts.filter((c) => c._count.members < MIN_VIABLE_MEMBERS && c._count.members > 0);

    for (const small of actuallySmall) {
      // Find another active cohort for same track
      const target = await this.prisma.cohort.findFirst({
        where: {
          trackId: small.trackId,
          status: CohortStatus.ACTIVE,
          id: { not: small.id },
          moduleStartIndex: small.moduleStartIndex,
        },
        include: { _count: { select: { members: true } } },
      });

      if (target && target._count.members + small._count.members <= MAX_COHORT_SIZE) {
        // Move all members
        await this.prisma.$transaction([
          this.prisma.cohortMember.updateMany({
            where: { cohortId: small.id },
            data: { cohortId: target.id },
          }),
          this.prisma.cohort.update({
            where: { id: small.id },
            data: { status: CohortStatus.DISBANDED },
          }),
        ]);
      }
    }
  }
}
