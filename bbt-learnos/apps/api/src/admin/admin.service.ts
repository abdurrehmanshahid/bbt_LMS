import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EnrollmentPlan, EnrollmentStatus, ModerationDecision, Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { ClickHouseService } from '../analytics/clickhouse.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

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

export interface LaunchChallengePayload {
  title: string;
  hashtag: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  isPinned?: boolean;
}

export interface CreateUserPayload {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  emailVerified?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  emailVerified?: boolean;
}

export interface EnrollUserPayload {
  trackId: string;
  plan?: EnrollmentPlan;
}

export interface UpdateEnrollmentPayload {
  status?: EnrollmentStatus;
  plan?: EnrollmentPlan;
}

export interface CreateCoursePayload {
  title: string;
  slug: string;
  description: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCoursePayload {
  title?: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}

export interface CreateModulePayload {
  title: string;
  description: string;
  estimatedMinutes: number;
  passingScore?: number;
  order?: number;
}

export interface UpdateModulePayload {
  title?: string;
  description?: string;
  estimatedMinutes?: number;
  passingScore?: number;
  order?: number;
  isActive?: boolean;
}

export interface CreateConceptPayload {
  title: string;
  description?: string;
  order?: number;
  prerequisiteIds?: string[];
}

const BCRYPT_COST = 12;
const DEFAULT_ADMIN_ENROLLMENT_PLAN = EnrollmentPlan.MONTHLY;

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
        data: { status: newStatus },
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
            track: { select: { id: true, title: true } },
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
        trackId: e.track.id,
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

  async createUser(payload: CreateUserPayload) {
    const existing = await this.prisma.user.findUnique({
      where: { email: payload.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) throw new ConflictException({ code: 'EMAIL_ALREADY_EXISTS', message: 'A user with this email already exists.' });

    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_COST);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: payload.name,
          passwordHash,
          role: payload.role,
          emailVerified: payload.emailVerified ?? true,
          ...(payload.role === UserRole.LEARNER ? { learnerProfile: { create: {} } } : {}),
          ...(payload.role === UserRole.CREATOR
            ? {
                creatorProfile: {
                  create: {
                    displayName: await uniqueCreatorDisplayName(tx, payload.name),
                    revenueSharePercent: 0,
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        enrolledTrack: null,
        subscriptionTier: null,
        createdAt: user.createdAt.toISOString(),
        lastActiveAt: user.updatedAt.toISOString(),
      };
    });
  }

  async updateUser(userId: string, payload: UpdateUserPayload) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) throw new NotFoundException('User not found');

    return this.prisma.$transaction(async (tx) => {
      const nextRole = payload.role ?? existing.role;

      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...(payload.name !== undefined ? { name: payload.name } : {}),
          ...(payload.role !== undefined ? { role: payload.role } : {}),
          ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
          ...(payload.emailVerified !== undefined ? { emailVerified: payload.emailVerified } : {}),
        },
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
      });

      if (nextRole === UserRole.LEARNER) {
        await tx.learnerProfile.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
      }
      if (nextRole === UserRole.CREATOR) {
        await tx.creatorProfile.upsert({
          where: { userId },
          create: {
            userId,
            displayName: await uniqueCreatorDisplayName(tx, user.name),
            revenueSharePercent: 0,
          },
          update: {},
        });
      }

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
      };
    });
  }

  async enrollUser(userId: string, payload: EnrollUserPayload) {
    const [user, track] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
      this.prisma.track.findUnique({ where: { id: payload.trackId }, select: { id: true } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!track) throw new NotFoundException('Track not found');

    return this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { role: UserRole.LEARNER } });
      await tx.learnerProfile.upsert({
        where: { userId },
        create: { userId, currentTrackId: payload.trackId },
        update: { currentTrackId: payload.trackId },
      });

      const existing = await tx.enrollment.findUnique({
        where: { learnerId_trackId: { learnerId: userId, trackId: payload.trackId } },
        select: { id: true, status: true },
      });

      const enrollment = await tx.enrollment.upsert({
        where: { learnerId_trackId: { learnerId: userId, trackId: payload.trackId } },
        create: {
          learnerId: userId,
          trackId: payload.trackId,
          plan: payload.plan ?? DEFAULT_ADMIN_ENROLLMENT_PLAN,
          status: EnrollmentStatus.ACTIVE,
        },
        update: {
          plan: payload.plan ?? DEFAULT_ADMIN_ENROLLMENT_PLAN,
          status: EnrollmentStatus.ACTIVE,
          endDate: null,
        },
        select: { id: true, plan: true, status: true, startDate: true, track: { select: { id: true, title: true } } },
      });

      if (!existing || existing.status !== EnrollmentStatus.ACTIVE) {
        await tx.track.update({
          where: { id: payload.trackId },
          data: { enrollmentCount: { increment: 1 } },
        });
      }

      return {
        id: enrollment.id,
        trackId: enrollment.track.id,
        trackTitle: enrollment.track.title,
        plan: enrollment.plan,
        status: enrollment.status,
        startDate: enrollment.startDate.toISOString(),
      };
    });
  }

  async updateEnrollment(userId: string, trackId: string, payload: UpdateEnrollmentPayload) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
      select: { status: true },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const nextStatus = payload.status ?? enrollment.status;
    const updated = await this.prisma.enrollment.update({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
      data: {
        ...(payload.plan ? { plan: payload.plan } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        ...(nextStatus === EnrollmentStatus.ACTIVE ? { endDate: null } : { endDate: new Date() }),
      },
      select: { id: true, plan: true, status: true, startDate: true, track: { select: { id: true, title: true } } },
    });

    return {
      id: updated.id,
      trackId: updated.track.id,
      trackTitle: updated.track.title,
      plan: updated.plan,
      status: updated.status,
      startDate: updated.startDate.toISOString(),
    };
  }

  async getCourses() {
    const tracks = await this.prisma.track.findMany({
      orderBy: { trackNumber: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        trackNumber: true,
        isActive: true,
        enrollmentCount: true,
        avgCompletionRate: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { modules: true, content: true, enrollments: true } },
      },
    });

    return tracks.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      icon: track.icon,
      trackNumber: track.trackNumber,
      status: track.isActive ? 'PUBLISHED' : 'DRAFT',
      enrollmentCount: track.enrollmentCount,
      avgCompletionRate: track.avgCompletionRate,
      moduleCount: track._count.modules,
      contentCount: track._count.content,
      activeEnrollmentCount: track._count.enrollments,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    }));
  }

  async createCourse(payload: CreateCoursePayload) {
    const maxTrack = await this.prisma.track.aggregate({ _max: { trackNumber: true } });
    const created = await this.prisma.track.create({
      data: {
        title: payload.title,
        slug: normalizeSlug(payload.slug),
        description: payload.description,
        icon: payload.icon ?? 'BBT',
        isActive: payload.isActive ?? false,
        trackNumber: (maxTrack._max.trackNumber ?? 0) + 1,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        trackNumber: true,
        isActive: true,
        enrollmentCount: true,
        avgCompletionRate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...created,
      status: created.isActive ? 'PUBLISHED' : 'DRAFT',
      moduleCount: 0,
      contentCount: 0,
      activeEnrollmentCount: 0,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async updateCourse(trackId: string, payload: UpdateCoursePayload) {
    const track = await this.prisma.track.update({
      where: { id: trackId },
      data: {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.icon !== undefined ? { icon: payload.icon } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        trackNumber: true,
        isActive: true,
        enrollmentCount: true,
        avgCompletionRate: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { modules: true, content: true, enrollments: true } },
      },
    });

    return {
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      icon: track.icon,
      trackNumber: track.trackNumber,
      status: track.isActive ? 'PUBLISHED' : 'DRAFT',
      enrollmentCount: track.enrollmentCount,
      avgCompletionRate: track.avgCompletionRate,
      moduleCount: track._count.modules,
      contentCount: track._count.content,
      activeEnrollmentCount: track._count.enrollments,
      createdAt: track.createdAt.toISOString(),
      updatedAt: track.updatedAt.toISOString(),
    };
  }

  // ─── Modules ──────────────────────────────────────────────────────────────────

  async getModules(trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const modules = await this.prisma.module.findMany({
      where: { trackId },
      orderBy: { order: 'asc' },
      select: {
        id: true, title: true, description: true, order: true,
        estimatedMinutes: true, passingScore: true, isActive: true,
        _count: { select: { concepts: true, content: true } },
      },
    });
    return modules;
  }

  async createModule(trackId: string, payload: CreateModulePayload) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const maxOrder = await this.prisma.module.aggregate({
      where: { trackId },
      _max: { order: true },
    });
    const order = payload.order ?? (maxOrder._max.order ?? 0) + 1;

    return this.prisma.module.create({
      data: {
        trackId,
        title: payload.title,
        description: payload.description,
        estimatedMinutes: payload.estimatedMinutes,
        passingScore: payload.passingScore ?? 60,
        order,
        isActive: true,
      },
      select: {
        id: true, title: true, description: true, order: true,
        estimatedMinutes: true, passingScore: true, isActive: true,
        _count: { select: { concepts: true, content: true } },
      },
    });
  }

  async updateModule(trackId: string, moduleId: string, payload: UpdateModulePayload) {
    const mod = await this.prisma.module.findFirst({ where: { id: moduleId, trackId } });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.module.update({
      where: { id: moduleId },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.description !== undefined && { description: payload.description }),
        ...(payload.estimatedMinutes !== undefined && { estimatedMinutes: payload.estimatedMinutes }),
        ...(payload.passingScore !== undefined && { passingScore: payload.passingScore }),
        ...(payload.order !== undefined && { order: payload.order }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      },
      select: {
        id: true, title: true, description: true, order: true,
        estimatedMinutes: true, passingScore: true, isActive: true,
        _count: { select: { concepts: true, content: true } },
      },
    });
  }

  async deleteModule(trackId: string, moduleId: string) {
    const mod = await this.prisma.module.findFirst({ where: { id: moduleId, trackId } });
    if (!mod) throw new NotFoundException('Module not found');
    await this.prisma.module.delete({ where: { id: moduleId } });
    return { deleted: true };
  }

  // ─── Concepts ─────────────────────────────────────────────────────────────────

  async getConcepts(moduleId: string) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.concept.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      select: {
        id: true, title: true, description: true, order: true,
        prerequisites: { select: { prerequisiteId: true } },
      },
    });
  }

  async createConcept(moduleId: string, payload: CreateConceptPayload) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    const maxOrder = await this.prisma.concept.aggregate({
      where: { moduleId },
      _max: { order: true },
    });
    const order = payload.order ?? (maxOrder._max.order ?? 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const concept = await tx.concept.create({
        data: { moduleId, title: payload.title, description: payload.description ?? '', order },
        select: { id: true, title: true, description: true, order: true },
      });

      if (payload.prerequisiteIds?.length) {
        await tx.conceptPrerequisite.createMany({
          data: payload.prerequisiteIds.map((prereqId) => ({
            conceptId: concept.id,
            prerequisiteId: prereqId,
          })),
          skipDuplicates: true,
        });
      }
      return concept;
    });
  }

  async updateConcept(moduleId: string, conceptId: string, payload: { title?: string; description?: string }) {
    const concept = await this.prisma.concept.findFirst({ where: { id: conceptId, moduleId } });
    if (!concept) throw new NotFoundException('Concept not found');

    return this.prisma.concept.update({
      where: { id: conceptId },
      data: {
        ...(payload.title !== undefined && { title: payload.title }),
        ...(payload.description !== undefined && { description: payload.description }),
      },
      select: { id: true, title: true, description: true, order: true },
    });
  }

  async deleteConcept(moduleId: string, conceptId: string) {
    const concept = await this.prisma.concept.findFirst({ where: { id: conceptId, moduleId } });
    if (!concept) throw new NotFoundException('Concept not found');
    await this.prisma.concept.delete({ where: { id: conceptId } });
    return { deleted: true };
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

  async launchChallenge(adminId: string, payload: LaunchChallengePayload) {
    const slug = normalizeTagSlug(payload.hashtag);
    const name = toDisplayTag(payload.hashtag);
    if (!slug || !name) {
      throw new BadRequestException({
        code: 'INVALID_HASHTAG',
        message: 'Challenge hashtag is invalid',
        field: 'hashtag',
      });
    }

    const startsAt = payload.startsAt ? new Date(payload.startsAt) : new Date();
    const endsAt = payload.endsAt ? new Date(payload.endsAt) : null;
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException({
        code: 'INVALID_START_DATE',
        message: 'Challenge start date is invalid',
        field: 'startsAt',
      });
    }
    if (endsAt && (Number.isNaN(endsAt.getTime()) || endsAt <= startsAt)) {
      throw new BadRequestException({
        code: 'INVALID_END_DATE',
        message: 'Challenge end date must be after the start date',
        field: 'endsAt',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const tag = await tx.contentTag.upsert({
        where: { slug },
        create: { name, slug },
        update: { name },
        select: { id: true, name: true, slug: true },
      });

      const isPinned = payload.isPinned ?? true;
      if (isPinned) {
        await tx.challenge.updateMany({
          where: { isPinned: true },
          data: { isPinned: false },
        });
      }

      const challenge = await tx.challenge.create({
        data: {
          title: payload.title,
          description: payload.description ?? '',
          startsAt,
          endsAt,
          isPinned,
          createdById: adminId,
          tagId: tag.id,
        },
        select: {
          id: true,
          title: true,
          description: true,
          startsAt: true,
          endsAt: true,
          isPinned: true,
        },
      });

      return { ...challenge, tag };
    });
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

  // ── Comment moderation queue ────────────────────────────────────────────────

  async getFlaggedComments(cursor?: string) {
    const comments = await this.prisma.contentComment.findMany({
      where: {
        isHidden: true,
        isDeleted: false,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: [{ reportCount: 'desc' }, { createdAt: 'desc' }],
      take: 30,
      select: {
        id: true,
        body: true,
        hiddenReason: true,
        reportCount: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
        content: { select: { id: true, title: true } },
        reports: {
          take: 10,
          select: { reason: true, createdAt: true, reporter: { select: { name: true } } },
        },
      },
    });

    const nextCursor = comments.length === 30
      ? comments[comments.length - 1]?.createdAt.toISOString() ?? null
      : null;

    return { comments, nextCursor };
  }

  async restoreComment(commentId: string) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.contentComment.update({
      where: { id: commentId },
      data: { isHidden: false, hiddenReason: null },
    });

    return { restored: commentId };
  }

  async deleteCommentByAdmin(commentId: string) {
    const comment = await this.prisma.contentComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    await this.prisma.contentComment.update({
      where: { id: commentId },
      data: { isDeleted: true, isHidden: true, hiddenReason: 'MODERATOR', body: '[removed by moderator]' },
    });

    return { deleted: commentId };
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

function normalizeTagSlug(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function toDisplayTag(value: string): string {
  return value
    .trim()
    .replace(/^#/, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function normalizeSlug(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  if (!slug) {
    throw new BadRequestException({
      code: 'INVALID_SLUG',
      message: 'Course slug is invalid',
      field: 'slug',
    });
  }
  return slug;
}

async function uniqueCreatorDisplayName(
  tx: Prisma.TransactionClient,
  name: string,
): Promise<string> {
  const base = name
    .trim()
    .replace(/[^a-zA-Z0-9 ]+/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 40) || 'Creator';

  let candidate = base;
  let suffix = 2;
  while (await tx.creatorProfile.findUnique({ where: { displayName: candidate }, select: { id: true } })) {
    candidate = `${base} ${suffix}`;
    suffix += 1;
  }
  return candidate;
}
