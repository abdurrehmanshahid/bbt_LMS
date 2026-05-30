import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, ContentType, EnrollmentPlan, EnrollmentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const TRACKS_CACHE_TTL = 86400;
const TRACKS_CACHE_KEY = 'cache:tracks:all';

export type ModuleStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'ASSESSMENT_PENDING';

export interface TrackSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  enrollmentCount: number;
  avgCompletionRate: number;
  _count: { modules: number };
}

export interface TrackDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  enrollmentCount: number;
  avgCompletionRate: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  modules: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    estimatedMinutes: number;
    passingScore: number;
    _count: { concepts: number; content: number };
  }>;
}

export interface ModuleWithStatus {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  passingScore: number;
  conceptCount: number;
  contentCount: number;
  status: ModuleStatus;
}

export interface EnrolledTrack {
  id: string;
  title: string;
  icon: string;
  description: string;
  modules: Array<ModuleWithStatus & { prerequisiteTitle: string | null }>;
  completionPercent: number;
}

@Injectable()
export class TrackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(): Promise<TrackSummary[]> {
    const cached = await this.redis.get(TRACKS_CACHE_KEY);
    if (cached) return JSON.parse(cached) as TrackSummary[];

    const tracks = await this.prisma.track.findMany({
      where: { isActive: true },
      orderBy: { trackNumber: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        trackNumber: true,
        enrollmentCount: true,
        avgCompletionRate: true,
        _count: { select: { modules: true } },
      },
    });

    await this.redis.set(TRACKS_CACHE_KEY, JSON.stringify(tracks), 'EX', TRACKS_CACHE_TTL);
    return tracks;
  }

  async findBySlug(slug: string): Promise<TrackDetail> {
    const cacheKey = `cache:track:${slug}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as TrackDetail;

    const track = await this.prisma.track.findUnique({
      where: { slug },
      include: {
        modules: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            order: true,
            title: true,
            description: true,
            estimatedMinutes: true,
            passingScore: true,
            _count: { select: { concepts: true, content: true } },
          },
        },
      },
    });

    if (!track) throw new NotFoundException(`Track "${slug}" not found`);

    await this.redis.set(cacheKey, JSON.stringify(track), 'EX', TRACKS_CACHE_TTL);
    return track;
  }

  async getPublicModules(trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    return this.prisma.module.findMany({
      where: { trackId, isActive: true },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true, estimatedMinutes: true },
    });
  }

  async getPublicConcepts(moduleId: string) {
    const mod = await this.prisma.module.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    return this.prisma.concept.findMany({
      where: { moduleId },
      orderBy: { order: 'asc' },
      select: { id: true, title: true, order: true },
    });
  }

  async getModulesWithLockStatus(trackId: string, userId: string): Promise<ModuleWithStatus[]> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
    });

    const modules = await this.prisma.module.findMany({
      where: { trackId, isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { concepts: true, content: true } },
        assessments: {
          where: { learnerId: userId, passed: true },
          select: { id: true },
          take: 1,
        },
      },
    });

    // Map of moduleId → whether that module's assessment was passed
    const passedIds = new Set<string>();
    for (const m of modules) {
      if (m.assessments.length > 0) passedIds.add(m.id);
    }

    const isPaid =
      enrollment?.status === EnrollmentStatus.ACTIVE &&
      enrollment.plan !== EnrollmentPlan.FREE;

    return modules.map((m, idx): ModuleWithStatus => {
      const passed = passedIds.has(m.id);
      const prevPassed = idx === 0 ? true : passedIds.has(modules[idx - 1].id);

      let status: ModuleStatus;

      if (!enrollment) {
        status = 'LOCKED';
      } else if (passed) {
        status = 'COMPLETED';
      } else if (idx < 2) {
        // First 2 modules always accessible on any enrollment
        status = 'AVAILABLE';
      } else if (!isPaid) {
        status = 'LOCKED';
      } else if (prevPassed) {
        status = 'AVAILABLE';
      } else {
        status = 'LOCKED';
      }

      return {
        id: m.id,
        order: m.order,
        title: m.title,
        description: m.description,
        estimatedMinutes: m.estimatedMinutes,
        passingScore: m.passingScore,
        conceptCount: m._count.concepts,
        contentCount: m._count.content,
        status,
      };
    });
  }

  async getLearnerDashboard(userId: string) {
    const [profile, enrollments, notificationCount] = await this.prisma.$transaction([
      this.prisma.learnerProfile.findUnique({
        where: { userId },
        select: { streakDays: true, currentTrackId: true, currentModuleId: true },
      }),
      this.prisma.enrollment.findMany({
        where: { learnerId: userId, status: EnrollmentStatus.ACTIVE },
        orderBy: { createdAt: 'asc' },
        include: {
          track: {
            select: {
              id: true,
              title: true,
              icon: true,
              modules: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
                select: { id: true, title: true },
              },
            },
          },
        },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    const activeEnrollment = enrollments.find((item) => item.trackId === profile?.currentTrackId) ?? enrollments[0] ?? null;
    const modules = activeEnrollment
      ? await this.getModulesWithLockStatus(activeEnrollment.trackId, userId)
      : [];
    const completedCount = modules.filter((item) => item.status === 'COMPLETED').length;
    const currentModule =
      modules.find((item) => item.id === profile?.currentModuleId) ??
      modules.find((item) => item.status === 'AVAILABLE') ??
      modules[0] ??
      null;

    const upcomingSessions = activeEnrollment
      ? await this.prisma.liveSession.findMany({
          where: {
            trackId: activeEnrollment.trackId,
            status: 'SCHEDULED',
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 3,
          select: {
            id: true,
            title: true,
            scheduledAt: true,
            track: { select: { title: true } },
          },
        })
      : [];

    return {
      streak: profile?.streakDays ?? 0,
      notificationCount,
      trackProgress: activeEnrollment
        ? {
            trackId: activeEnrollment.track.id,
            trackTitle: activeEnrollment.track.title,
            trackIcon: activeEnrollment.track.icon,
            currentModuleId: currentModule?.id ?? '',
            currentModuleTitle: currentModule?.title ?? 'Course setup pending',
            completionPercent: modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0,
            nextStep: currentModule
              ? currentModule.status === 'COMPLETED'
                ? 'Continue to the next module'
                : `Open ${currentModule.title}`
              : 'Course modules are being prepared',
          }
        : null,
      cohort: null,
      upcomingSessions: upcomingSessions.map((session) => ({
        id: session.id,
        title: session.title,
        startsAt: session.scheduledAt.toISOString(),
        trackTitle: session.track.title,
      })),
    };
  }

  async getLearnerCourses(userId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { learnerId: userId, status: EnrollmentStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
      include: {
        track: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            icon: true,
            enrollmentCount: true,
            avgCompletionRate: true,
            _count: { select: { modules: true } },
          },
        },
      },
    });

    return enrollments.map((enrollment) => ({
      ...enrollment.track,
      plan: enrollment.plan,
      status: enrollment.status,
      enrolledAt: enrollment.startDate.toISOString(),
    }));
  }

  async getEnrolledTrack(trackId: string, userId: string): Promise<EnrolledTrack> {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
      select: { status: true },
    });
    if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
      throw new ForbiddenException('Learner is not enrolled in this track');
    }

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: { id: true, title: true, icon: true, description: true },
    });
    if (!track) throw new NotFoundException('Track not found');

    const modules = await this.getModulesWithLockStatus(trackId, userId);
    const completedCount = modules.filter((item) => item.status === 'COMPLETED').length;

    return {
      ...track,
      modules: modules.map((item, index) => ({
        ...item,
        prerequisiteTitle: item.status === 'LOCKED' && index > 0 ? modules[index - 1]?.title ?? null : null,
      })),
      completionPercent: modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0,
    };
  }

  async getModuleDetail(trackId: string, moduleId: string, userId: string) {
    const track = await this.getEnrolledTrack(trackId, userId);
    const moduleStatus = track.modules.find((item) => item.id === moduleId);
    if (!moduleStatus) throw new NotFoundException('Module not found');
    if (moduleStatus.status === 'LOCKED') throw new ForbiddenException('Module is locked');

    const module = await this.prisma.module.findFirst({
      where: { id: moduleId, trackId, isActive: true },
      include: {
        concepts: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, description: true },
        },
        content: {
          where: { status: ContentStatus.APPROVED },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            title: true,
            type: true,
            muxPlaybackId: true,
            duration: true,
            description: true,
            thumbnailUrl: true,
          },
        },
      },
    });
    if (!module) throw new NotFoundException('Module not found');

    const resources = module.content
      .filter((item) => item.type === ContentType.RESOURCE)
      .map((item) => ({
        id: item.id,
        name: item.title,
        url: item.thumbnailUrl ?? `/content/${item.id}`,
        type: item.type,
      }));

    return {
      id: module.id,
      title: module.title,
      description: module.description,
      estimatedMinutes: module.estimatedMinutes,
      status: moduleStatus.status,
      concepts: module.concepts,
      resources,
      hasAssessment: Boolean(module.questions),
      passingScore: module.passingScore,
      questionCount: countQuestions(module.questions),
      content: module.content
        .filter((item) => item.type !== ContentType.RESOURCE)
        .map((item) => ({
          id: item.id,
          title: item.title,
          muxPlaybackId: item.muxPlaybackId,
          duration: item.duration,
          type: item.type,
          watched: false,
          watchedPercent: 0,
        })),
    };
  }

  async authorizePlayback(contentId: string, userId: string): Promise<{ playbackId: string; signedToken: string | null }> {
    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, trackId: true, moduleId: true, muxPlaybackId: true, status: true },
    });
    if (!content || content.status !== ContentStatus.APPROVED || !content.muxPlaybackId) {
      throw new NotFoundException('Content not found');
    }

    if (content.moduleId) {
      await this.getModuleDetail(content.trackId, content.moduleId, userId);
    } else {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { learnerId_trackId: { learnerId: userId, trackId: content.trackId } },
        select: { status: true },
      });
      if (!enrollment || enrollment.status !== EnrollmentStatus.ACTIVE) {
        throw new ForbiddenException('Learner is not enrolled in this track');
      }
    }

    return { playbackId: content.muxPlaybackId, signedToken: null };
  }

  async getPublicContentForTrack(trackId: string) {
    return this.prisma.content.findMany({
      where: { trackId, status: ContentStatus.APPROVED },
      orderBy: { viewCount: 'desc' },
      take: 20,
      select: {
        id: true,
        title: true,
        type: true,
        duration: true,
        thumbnailUrl: true,
        viewCount: true,
        creator: { select: { name: true, creatorProfile: { select: { displayName: true, tier: true } } } },
      },
    });
  }
}

function countQuestions(value: unknown): number {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object' && 'questions' in value) {
    const questions = (value as { questions?: unknown }).questions;
    return Array.isArray(questions) ? questions.length : 0;
  }
  return 0;
}
