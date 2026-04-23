import { Injectable, NotFoundException } from '@nestjs/common';
import { ContentStatus, EnrollmentPlan, EnrollmentStatus } from '@prisma/client';
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
      const prevPassed = idx === 0 ? true : passedIds.has(modules[idx - 1]!.id);

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
