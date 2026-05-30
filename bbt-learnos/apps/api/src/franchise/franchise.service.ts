import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_CHECKLIST = [
  { id: 'psda_cert', label: 'PSDA Certificate uploaded', done: false },
  { id: 'navttc_cert', label: 'NAVTTC Affiliation document uploaded', done: false },
  { id: 'trainer_id', label: 'Lead trainer ID verified', done: false },
  { id: 'facility_photos', label: 'Facility photos submitted', done: false },
  { id: 'monthly_report', label: 'Monthly progress report submitted', done: false },
  { id: 'safety_audit', label: 'Safety & equipment audit passed', done: false },
];

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  doneAt?: string;
}

@Injectable()
export class FranchiseService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Get own franchise ────────────────────────────────────────────────────────

  private async getFranchise(ownerId: string) {
    const f = await this.prisma.franchise.findUnique({
      where: { ownerId },
      include: { learners: true },
    });
    if (!f) throw new NotFoundException('Franchise not found for this account');
    return f;
  }

  // ── Dashboard summary ────────────────────────────────────────────────────────

  async getDashboard(ownerId: string) {
    const franchise = await this.getFranchise(ownerId);
    const learnerIds = franchise.learners.map((l) => l.userId);

    const [enrollments, badges, assessments] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { learnerId: { in: learnerIds }, status: 'ACTIVE' },
        select: { learnerId: true, trackId: true, plan: true },
      }),
      this.prisma.skillBadge.groupBy({
        by: ['learnerId'],
        where: { learnerId: { in: learnerIds }, isRevoked: false },
        _count: { id: true },
      }),
      this.prisma.assessment.findMany({
        where: { learnerId: { in: learnerIds }, passed: true },
        select: { learnerId: true },
      }),
    ]);

    const badgeMap = Object.fromEntries(badges.map((b) => [b.learnerId, b._count.id]));
    const passedSet = new Set(assessments.map((a) => a.learnerId));

    const activeLearners = new Set(enrollments.map((e) => e.learnerId)).size;
    const totalLearners = learnerIds.length;
    const totalBadges = badges.reduce((sum, b) => sum + b._count.id, 0);
    const learnersWithBadges = badges.length;
    const completionRate = totalLearners > 0
      ? Math.round((passedSet.size / totalLearners) * 100)
      : 0;

    // Revenue estimate: active paid enrollments * PKR 2999 * revenueSharePercent
    const paidCount = enrollments.filter((e) => e.plan !== 'FREE').length;
    const estimatedRevenue = Math.round(paidCount * 2999 * (franchise.revenueSharePercent / 100));

    // Track breakdown
    const trackGroups: Record<string, number> = {};
    for (const e of enrollments) {
      trackGroups[e.trackId] = (trackGroups[e.trackId] ?? 0) + 1;
    }

    return {
      franchise: {
        id: franchise.id,
        name: franchise.name,
        city: franchise.city,
        psdaStatus: franchise.psdaStatus,
        navttcStatus: franchise.navttcStatus,
        revenueSharePercent: franchise.revenueSharePercent,
        setupFeePaid: franchise.setupFeePaid,
      },
      stats: {
        totalLearners,
        activeLearners,
        totalBadges,
        learnersWithBadges,
        completionRate,
        estimatedRevenueMonthPKR: estimatedRevenue,
        paidEnrollments: paidCount,
      },
      learnersPerTrack: Object.entries(trackGroups).map(([trackId, count]) => ({ trackId, count })),
      badgeLeaderboard: Object.entries(badgeMap)
        .map(([learnerId, count]) => ({ learnerId, badges: count }))
        .sort((a, b) => b.badges - a.badges)
        .slice(0, 10),
    };
  }

  // ── Learner list ─────────────────────────────────────────────────────────────

  async getLearners(ownerId: string, page = 1, limit = 20) {
    const franchise = await this.getFranchise(ownerId);
    const learnerIds = franchise.learners.map((l) => l.userId);

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: learnerIds } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, email: true, avatarUrl: true, createdAt: true,
          learnerProfile: {
            select: {
              streakDays: true, absorptionStatus: true, absorptionScore: true,
              currentTrack: { select: { title: true, icon: true } },
            },
          },
          enrollments: {
            where: { status: 'ACTIVE' },
            select: { plan: true, track: { select: { title: true } } },
          },
          skillBadges: {
            where: { isRevoked: false },
            select: { id: true },
          },
        },
      }),
      this.prisma.user.count({ where: { id: { in: learnerIds } } }),
    ]);

    return {
      rows: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        joinedAt: u.createdAt.toISOString(),
        currentTrack: u.learnerProfile?.currentTrack ?? null,
        streakDays: u.learnerProfile?.streakDays ?? 0,
        absorptionStatus: u.learnerProfile?.absorptionStatus ?? 'INELIGIBLE',
        absorptionScore: Math.round((u.learnerProfile?.absorptionScore ?? 0) * 100),
        badgeCount: u.skillBadges.length,
        activeEnrollments: u.enrollments.map((e) => ({ track: e.track.title, plan: e.plan })),
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Compliance ───────────────────────────────────────────────────────────────

  async getCompliance(ownerId: string) {
    const franchise = await this.getFranchise(ownerId);
    const checklist = (franchise.complianceChecklist as ChecklistItem[] | null) ?? DEFAULT_CHECKLIST;
    const doneCount = checklist.filter((i) => i.done).length;

    return {
      psdaStatus: franchise.psdaStatus,
      navttcStatus: franchise.navttcStatus,
      complianceCheckedAt: franchise.complianceCheckedAt?.toISOString() ?? null,
      progress: Math.round((doneCount / checklist.length) * 100),
      checklist,
      overallStatus:
        franchise.psdaStatus === 'ACTIVE' && franchise.navttcStatus === 'ACTIVE' && doneCount === checklist.length
          ? 'green'
          : franchise.psdaStatus === 'SUSPENDED' || franchise.navttcStatus === 'SUSPENDED'
          ? 'red'
          : 'yellow',
    };
  }

  async toggleComplianceItem(ownerId: string, itemId: string) {
    const franchise = await this.getFranchise(ownerId);
    const checklist: ChecklistItem[] =
      (franchise.complianceChecklist as ChecklistItem[] | null) ?? DEFAULT_CHECKLIST.map((i) => ({ ...i }));

    const item = checklist.find((i) => i.id === itemId);
    if (!item) throw new NotFoundException('Checklist item not found');

    item.done = !item.done;
    if (item.done) item.doneAt = new Date().toISOString();
    else delete item.doneAt;

    await this.prisma.franchise.update({
      where: { id: franchise.id },
      data: {
        complianceChecklist: checklist as unknown as import('@prisma/client').Prisma.InputJsonValue,
        complianceCheckedAt: new Date(),
      },
    });

    return { itemId, done: item.done };
  }

  // ── Enroll a learner into this franchise (admin/owner action) ─────────────────

  async assignLearner(ownerId: string, learnerId: string) {
    const franchise = await this.getFranchise(ownerId);

    const profile = await this.prisma.learnerProfile.findUnique({ where: { userId: learnerId } });
    if (!profile) throw new NotFoundException('Learner profile not found');
    if (profile.franchiseId && profile.franchiseId !== franchise.id) {
      throw new ForbiddenException('Learner already assigned to another franchise');
    }

    await this.prisma.learnerProfile.update({
      where: { userId: learnerId },
      data: { franchiseId: franchise.id },
    });

    return { assigned: true, learnerId, franchiseId: franchise.id };
  }

  async removeLearner(ownerId: string, learnerId: string) {
    const franchise = await this.getFranchise(ownerId);

    await this.prisma.learnerProfile.updateMany({
      where: { userId: learnerId, franchiseId: franchise.id },
      data: { franchiseId: null },
    });

    return { removed: true, learnerId };
  }
}
