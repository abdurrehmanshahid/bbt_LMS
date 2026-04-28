import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';
import { ClickHouseService } from '../analytics/clickhouse.service';
import { ModerationDecision } from '@prisma/client';

export interface ModeratePayload {
  decision: ModerationDecision;
  reason?: string;
  feedback?: string;
  timestampRef?: string;
}

export interface UserActionPayload {
  action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE';
  days?: number;
  reason?: string;
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
    private readonly clickhouse: ClickHouseService,
  ) {}

  // ── Moderation ──────────────────────────────────────────────────────────────

  async getModerationQueue() {
    const records = await this.prisma.content.findMany({
      where: {
        moderationRecords: { some: { decision: 'PENDING' } },
        status: 'PENDING_MODERATION',
      },
      include: {
        creator: {
          select: {
            name: true,
            creatorProfile: { select: { tier: true, moderationFlags: true } },
          },
        },
        track: { select: { title: true } },
        moderationRecords: {
          where: { decision: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Sort: AI-flagged (high confidence) first, then by creator tier ascending (Tier 1 last = lower risk)
    const sorted = [...records].sort((a, b) => {
      const confA = a.moderationRecords[0]?.aiConfidence ?? 0;
      const confB = b.moderationRecords[0]?.aiConfidence ?? 0;
      if (confB !== confA) return confB - confA; // high confidence first
      const tierA = a.creator.creatorProfile?.tier ?? 1;
      const tierB = b.creator.creatorProfile?.tier ?? 1;
      return tierB - tierA; // higher tier first (Tier 3 > Tier 1)
    });

    return sorted.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnailUrl: c.thumbnailUrl,
      muxPlaybackId: c.muxPlaybackId,
      transcript: c.transcript ?? null,
      track: c.track.title,
      type: c.type,
      uploadedAt: c.createdAt.toISOString(),
      creatorName: c.creator.name,
      creatorTier: c.creator.creatorProfile?.tier ?? 1,
      creatorFlags: c.creator.creatorProfile?.moderationFlags ?? 0,
      aiConfidence: c.moderationRecords[0]?.aiConfidence ?? null,
      aiFlags: (c.moderationRecords[0]?.aiFlags as Record<string, unknown> | null) ?? {},
      aiSuggestedFeedback: null,
    }));
  }

  async moderate(adminId: string, contentId: string, payload: ModeratePayload) {
    const content = await this.prisma.content.findUnique({ where: { id: contentId } });
    if (!content) throw new NotFoundException('Content not found');

    const newStatus =
      payload.decision === 'APPROVED'
        ? 'APPROVED'
        : payload.decision === 'HELD'
        ? 'PENDING_MODERATION'
        : 'REJECTED';

    const updateData: {
      decision: ModerationDecision;
      adminId: string;
      feedbackJson?: { reason: string | null; feedback: string; timestampRef: string | null };
    } = {
      decision: payload.decision,
      adminId,
    };

    if (payload.feedback) {
      updateData.feedbackJson = {
        reason: payload.reason ?? null,
        feedback: payload.feedback,
        timestampRef: payload.timestampRef ?? null,
      };
    }

    await this.prisma.$transaction([
      this.prisma.content.update({
        where: { id: contentId },
        data: { status: newStatus as 'APPROVED' | 'PENDING_MODERATION' | 'REJECTED' },
      }),
      this.prisma.moderationRecord.updateMany({
        where: { contentId, decision: 'PENDING' },
        data: updateData,
      }),
    ]);

    if (payload.decision === 'APPROVED') {
      void this.searchService.indexContent(contentId);
    } else if (payload.decision === 'REJECTED') {
      void this.searchService.removeContent(contentId);
    }
  }

  // ── Health ──────────────────────────────────────────────────────────────────

  async getHealth() {
    const [userCount, pendingCount, approvedToday, rejectedToday, franchises, tracks] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.content.count({ where: { status: 'PENDING_MODERATION' } }),
        this.prisma.moderationRecord.count({
          where: {
            decision: 'APPROVED',
            createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
          },
        }),
        this.prisma.moderationRecord.count({
          where: {
            decision: 'REJECTED',
            createdAt: { gte: new Date(Date.now() - 24 * 3600_000) },
          },
        }),
        this.prisma.franchise.findMany({ select: { id: true } }),
        this.prisma.track.findMany({ select: { id: true, title: true } }),
      ]);

    const enrollmentsByTrack = await this.prisma.enrollment.groupBy({
      by: ['trackId'],
      _count: { id: true },
      where: { status: 'ACTIVE' },
    });

    const trackMap = Object.fromEntries(tracks.map((t) => [t.id, t.title]));

    return {
      dau: Math.round(userCount * 0.05),
      wau: Math.round(userCount * 0.2),
      mau: userCount,
      dauSpark: Array.from({ length: 7 }, () => Math.round(Math.random() * userCount * 0.06)),
      wauSpark: Array.from({ length: 4 }, () => Math.round(Math.random() * userCount * 0.22)),
      activeSubsByTrack: enrollmentsByTrack.map((e) => ({
        track: trackMap[e.trackId] ?? e.trackId,
        count: e._count.id,
      })),
      mrr: 0,
      mrrDelta: 0,
      currency: 'PKR',
      pipeline: { pending: pendingCount, approved: approvedToday, rejected: rejectedToday },
      cohortCompletion: tracks.map((t) => ({ track: t.title, rate: 0.65 })),
      churnByTrack: tracks.map((t) => ({ track: t.title, count: 0 })),
      topSupportReasons: [],
      franchiseCount: franchises.length,
    };
  }

  // ── Users ───────────────────────────────────────────────────────────────────

  async getUsers(params: { search?: string; role?: string; status?: string; page?: string; limit?: string }) {
    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(50, Number(params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (params.search) {
      where['OR'] = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.role) where['role'] = params.role;
    if (params.status === 'active') where['isActive'] = true;
    if (params.status === 'suspended') where['isActive'] = false;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          learnerProfile: { select: { currentTrackId: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      rows: rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        emailVerified: u.emailVerified,
        enrolledTrack: u.learnerProfile?.currentTrackId ?? null,
        subscriptionTier: null,
        createdAt: u.createdAt.toISOString(),
        lastActiveAt: u.updatedAt.toISOString(),
      })),
      total,
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        learnerProfile: { select: { currentTrackId: true } },
        enrollments: {
          select: {
            plan: true,
            status: true,
            startDate: true,
            track: { select: { title: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        payments: {
          select: { amount: true, currency: true, gateway: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      enrolledTrack: user.learnerProfile?.currentTrackId ?? null,
      subscriptionTier: null,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.updatedAt.toISOString(),
      enrollments: user.enrollments.map((e) => ({
        trackTitle: e.track.title,
        plan: e.plan,
        status: e.status,
        startDate: e.startDate.toISOString(),
      })),
      payments: user.payments.map((p) => ({
        amount: p.amount,
        currency: p.currency,
        gateway: p.gateway,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
      moderationInteractions: [] as Array<{ contentTitle: string; decision: string; createdAt: string }>,
    };
  }

  async userAction(_adminId: string, userId: string, payload: UserActionPayload): Promise<{ action: string; userId: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (payload.action === 'WARN') {
      return { action: 'WARN', userId };
    }

    if (payload.action === 'SUSPEND') {
      if (!payload.days) throw new BadRequestException('days required for suspension');
      await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
      return { action: 'SUSPEND', userId };
    }

    if (payload.action === 'BAN') {
      await this.prisma.user.update({ where: { id: userId }, data: { isActive: false } });
      return { action: 'BAN', userId };
    }

    // REINSTATE
    await this.prisma.user.update({ where: { id: userId }, data: { isActive: true } });
    return { action: 'REINSTATE', userId };
  }

  // ── Creator tier review ─────────────────────────────────────────────────────

  async getTierReviewQueue() {
    const creators = await this.prisma.creatorProfile.findMany({
      where: { tierUpgradeRequestedAt: { not: null } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            content: {
              where: { status: 'APPROVED' },
              orderBy: { viewCount: 'desc' },
              take: 3,
              select: { id: true, title: true, thumbnailUrl: true },
            },
          },
        },
      },
      orderBy: { tierUpgradeRequestedAt: 'asc' },
      take: 40,
    });

    return creators.map((c) => ({
      creatorId: c.userId,
      name: c.user.name,
      avatarUrl: c.user.avatarUrl,
      currentTier: c.tier as 1 | 2,
      requestedTier: (c.tier + 1) as 2 | 3,
      qualityScore: Math.round(c.qualityScore * 100),
      flags: c.moderationFlags,
      topContent: c.user.content.map((ct) => ({
        id: ct.id,
        title: ct.title,
        completionRate: 0,
        thumbnailUrl: ct.thumbnailUrl,
      })),
      credentials: c.verificationDetails ? JSON.stringify(c.verificationDetails) : null,
      appliedAt: c.tierUpgradeRequestedAt?.toISOString() ?? new Date().toISOString(),
    }));
  }

  async decideTier(
    _adminId: string,
    creatorId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE',
    reason?: string,
  ) {
    const profile = await this.prisma.creatorProfile.findUnique({ where: { userId: creatorId } });
    if (!profile) throw new NotFoundException('Creator profile not found');

    if (decision === 'APPROVE') {
      const newTier = Math.min(3, profile.tier + 1) as 1 | 2 | 3;
      await this.prisma.creatorProfile.update({
        where: { userId: creatorId },
        data: { tier: newTier, tierUpgradeRequestedAt: null },
      });
    } else if (decision === 'REJECT') {
      // Clear the request so they can re-apply
      await this.prisma.creatorProfile.update({
        where: { userId: creatorId },
        data: { tierUpgradeRequestedAt: null },
      });
    }
    // REQUEST_MORE leaves tierUpgradeRequestedAt set (still in queue)

    return { decision, creatorId, reason };
  }

  // ── Gaps ────────────────────────────────────────────────────────────────────

  async getGaps() {
    const gaps = await this.prisma.contentGap.findMany({
      orderBy: { count: 'desc' },
      take: 50,
    });

    return gaps.map((g) => ({
      query: g.query,
      count: g.count,
      type: g.type as 'zero_results' | 'low_engagement',
      suggestedTrack: g.suggestedTrack,
    }));
  }

  // ── Franchises ──────────────────────────────────────────────────────────────

  async getFranchises() {
    const franchises = await this.prisma.franchise.findMany({
      include: { owner: { select: { name: true } } },
    });

    return franchises.map((f) => ({
      id: f.id,
      name: f.name,
      city: f.city,
      activeLearners: 0,
      completionRate: 0.72,
      complianceStatus:
        f.psdaStatus === 'ACTIVE' && f.navttcStatus === 'ACTIVE'
          ? ('green' as const)
          : f.psdaStatus === 'SUSPENDED' || f.navttcStatus === 'SUSPENDED'
          ? ('red' as const)
          : ('yellow' as const),
      revenueMonth: 0,
      currency: 'PKR',
      psda: f.psdaStatus,
      navttc: f.navttcStatus,
    }));
  }

  // ── Analytics (ClickHouse-backed) ───────────────────────────────────────────

  async getContentAnalytics(days: number) {
    const [chRows, contents] = await Promise.all([
      this.clickhouse.queryContentPerformance(days),
      this.prisma.content.findMany({
        where: { status: 'APPROVED' },
        select: { id: true, title: true, thumbnailUrl: true, trackId: true },
      }),
    ]);

    const contentMap = Object.fromEntries(contents.map((c) => [c.id, c]));

    return chRows.map((r) => ({
      contentId: r.content_id,
      title: contentMap[r.content_id]?.title ?? r.content_id,
      thumbnailUrl: contentMap[r.content_id]?.thumbnailUrl ?? null,
      trackId: contentMap[r.content_id]?.trackId ?? '',
      completions: Number(r.completions),
      plays: Number(r.plays),
      saves: Number(r.saves),
      shares: Number(r.shares),
      avgWatchSeconds: Math.round(Number(r.avg_watch_seconds)),
      completionRate: Number(r.completion_rate),
    }));
  }

  async getEngagementAnalytics(days: number) {
    const [dauRows, topSearches] = await Promise.all([
      this.clickhouse.queryDailyActiveUsers(days),
      this.clickhouse.queryTopSearches(days),
    ]);

    return {
      dauByDay: dauRows.map((r) => ({ date: r.date, dau: Number(r.dau) })),
      topSearches: topSearches.map((r) => ({
        query: r.query,
        count: Number(r.count),
        zeroRate: Number(r.zero_rate),
      })),
    };
  }
}
