import Mux from '@mux/mux-node';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { Queue } from 'bullmq';

import { ClickHouseService } from '../analytics/clickhouse.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MlService } from '../ml/ml.service';
import type { ModerationJobData } from '../moderation/moderation.processor';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

// Feed bucket weights
const BUCKET_WEIGHTS = {
  PROGRESSION: 0.4,
  REINFORCEMENT: 0.3,
  ADJACENT: 0.2,
  SOCIAL: 0.1,
} as const;

const FEED_PAGE_SIZE = 20;
const COLD_START_THRESHOLD = 20;
const TRENDING_WINDOW_DAYS = 7;
const MAX_TAGS_PER_CONTENT = 8;

export interface AnalyticsEventDto {
  contentId: string;
  event: 'play' | 'pause' | 'complete' | 'seek' | 'share' | 'save';
  positionSeconds?: number;
  durationSeconds?: number;
}

export interface ReelAnalyticsEventDto {
  contentId: string;
  event: 'reel_view' | 'reel_complete' | 'reel_share';
  positionSeconds?: number;
  durationSeconds?: number;
}

export interface TrendingTagDto {
  id: string;
  name: string;
  slug: string;
  count: number;
  isChallenge: boolean;
}

export interface PinnedChallengeDto {
  id: string;
  title: string;
  description: string;
  tag: { name: string; slug: string };
  startsAt: Date;
  endsAt: Date | null;
}

type CreatorTier = 1 | 2 | 3;
type CreatorDashboardStatus = 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'HELD';

export interface CreatorDashboardDto {
  kpis: {
    views30d: number;
    completionRate: number;
    revenueMonth: number;
    currency: string;
    subscriberCount: number;
    tier: CreatorTier;
    qualityScore: number;
    moderationFlags: number;
  };
  recentContent: Array<{
    id: string;
    title: string;
    type: ContentType;
    status: CreatorDashboardStatus;
    views: number;
    completionRate: number;
    saveRate: number;
    track: string;
    createdAt: string;
  }>;
}

export interface CreatorCourseDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  status: 'DRAFT' | 'PUBLISHED';
  moduleCount: number;
  contentCount: number;
  enrollmentCount: number;
  updatedAt: string;
}

@Injectable()
export class ContentService {
  private readonly mux: Mux;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly ml: MlService,
    private readonly clickhouse: ClickHouseService,
    @InjectQueue('moderation') private readonly moderationQueue: Queue<ModerationJobData>,
  ) {
    this.mux = new Mux({
      tokenId: this.config.get<string>('MUX_TOKEN_ID', ''),
      tokenSecret: this.config.get<string>('MUX_TOKEN_SECRET', ''),
      webhookSecret: this.config.get<string>('MUX_WEBHOOK_SECRET', ''),
    });
  }

  // ─── Public ─────────────────────────────────────────────────────────────────

  async findOne(id: string) {
    const content = await this.prisma.content.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        muxPlaybackId: true,
        duration: true,
        thumbnailUrl: true,
        tags: true,
        viewCount: true,
        saveCount: true,
        shareCount: true,
        status: true,
        trackId: true,
        moduleId: true,
        conceptId: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            creatorProfile: { select: { displayName: true, tier: true, isVerified: true } },
          },
        },
      },
    });

    if (!content) throw new NotFoundException('Content not found');
    if (content.status !== ContentStatus.APPROVED) throw new NotFoundException('Content not found');

    await this.prisma.content.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return content;
  }

  async getShortsFeed(cursor?: string): Promise<{ items: unknown[]; nextCursor: string | null; pinnedChallenge: PinnedChallengeDto | null }> {
    const [items, pinnedChallenge] = await Promise.all([
      this.prisma.content.findMany({
        where: {
          status: ContentStatus.APPROVED,
          type: ContentType.REEL,
        },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: [
          { shareCount: 'desc' },
          { saveCount: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: FEED_PAGE_SIZE,
        select: this.contentSelect(),
      }),
      cursor ? Promise.resolve(null) : this.getPinnedChallenge(),
    ]);

    const nextCursor =
      items.length === FEED_PAGE_SIZE
        ? items[items.length - 1]?.id ?? null
        : null;

    return { items, nextCursor, pinnedChallenge };
  }

  async getTrendingTags(): Promise<{ tags: TrendingTagDto[]; pinnedChallenge: PinnedChallengeDto | null }> {
    const since = new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 3600_000);
    const recent = await this.prisma.contentTagMap.groupBy({
      by: ['tagId'],
      where: { createdAt: { gte: since } },
      _count: { contentId: true },
      orderBy: { _count: { contentId: 'desc' } },
      take: 20,
    });

    const tagIds = recent.map((row) => row.tagId);
    const tags = tagIds.length > 0
      ? await this.prisma.contentTag.findMany({
          where: { id: { in: tagIds } },
          select: {
            id: true,
            name: true,
            slug: true,
            challenges: {
              where: this.activeChallengeWhere(),
              select: { id: true },
              take: 1,
            },
          },
        })
      : await this.prisma.contentTag.findMany({
          orderBy: { useCount: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            slug: true,
            useCount: true,
            challenges: {
              where: this.activeChallengeWhere(),
              select: { id: true },
              take: 1,
            },
          },
        });

    const recentCountByTag = new Map(recent.map((row) => [row.tagId, row._count.contentId]));
    const sortedTags: TrendingTagDto[] = tags
      .map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        count: recentCountByTag.get(tag.id) ?? getUseCount(tag),
        isChallenge: tag.challenges.length > 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      tags: sortedTags,
      pinnedChallenge: await this.getPinnedChallenge(),
    };
  }

  async getTaggedReels(slug: string, cursor?: string): Promise<{ tag: { name: string; slug: string }; items: unknown[]; nextCursor: string | null }> {
    const normalizedSlug = normalizeTagSlug(slug);
    if (!normalizedSlug) {
      throw new BadRequestException({
        code: 'INVALID_HASHTAG',
        message: 'Hashtag slug is invalid',
        field: 'slug',
      });
    }

    const tag = await this.prisma.contentTag.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true, name: true, slug: true },
    });
    if (!tag) throw new NotFoundException('Hashtag not found');

    const items = await this.prisma.content.findMany({
      where: {
        status: ContentStatus.APPROVED,
        type: ContentType.REEL,
        tagMaps: { some: { tagId: tag.id } },
      },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [
        { shareCount: 'desc' },
        { saveCount: 'desc' },
        { viewCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: FEED_PAGE_SIZE,
      select: this.contentSelect(),
    });

    const nextCursor =
      items.length === FEED_PAGE_SIZE
        ? items[items.length - 1]?.id ?? null
        : null;

    return { tag: { name: tag.name, slug: tag.slug }, items, nextCursor };
  }

  async suggestHashtags(trackId?: string): Promise<{ tags: string[] }> {
    const defaults = ['BBTLearnOS', 'SkillReel', 'CareerOS'];
    if (!trackId) return { tags: defaults };

    const [track, popularMaps] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId }, select: { title: true, slug: true } }),
      this.prisma.contentTagMap.groupBy({
        by: ['tagId'],
        where: { content: { trackId } },
        _count: { contentId: true },
        orderBy: { _count: { contentId: 'desc' } },
        take: 5,
      }),
    ]);

    const popularTags = popularMaps.length > 0
      ? await this.prisma.contentTag.findMany({
          where: { id: { in: popularMaps.map((row) => row.tagId) } },
          select: { name: true },
        })
      : [];

    const trackTags = track ? deriveTrackTags(track.title, track.slug) : [];
    return {
      tags: uniqueTags([...popularTags.map((tag) => tag.name), ...trackTags, ...defaults]).slice(0, 8),
    };
  }

  async getCreatorDashboard(user: JwtPayload): Promise<CreatorDashboardDto> {
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Creator or Admin role required');
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);
    const [profile, recentContent, viewsAggregate, subscriberCount] = await Promise.all([
      this.prisma.creatorProfile.findUnique({
        where: { userId: user.sub },
        select: { tier: true, qualityScore: true, moderationFlags: true },
      }),
      this.prisma.content.findMany({
        where: { creatorId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          viewCount: true,
          saveCount: true,
          createdAt: true,
          track: { select: { title: true } },
        },
      }),
      this.prisma.content.aggregate({
        where: { creatorId: user.sub, createdAt: { gte: thirtyDaysAgo } },
        _sum: { viewCount: true },
      }),
      this.prisma.follow.count({ where: { creatorId: user.sub } }),
    ]);

    return {
      kpis: {
        views30d: viewsAggregate._sum.viewCount ?? 0,
        completionRate: 0,
        revenueMonth: 0,
        currency: 'PKR',
        subscriberCount,
        tier: toCreatorTier(profile?.tier),
        qualityScore: normalizeQualityScore(profile?.qualityScore),
        moderationFlags: profile?.moderationFlags ?? countFlaggedContent(recentContent),
      },
      recentContent: recentContent.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        status: toDashboardStatus(item.status),
        views: item.viewCount,
        completionRate: 0,
        saveRate: item.viewCount > 0 ? item.saveCount / item.viewCount : 0,
        track: item.track.title,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  async getCreatorCourses(user: JwtPayload): Promise<CreatorCourseDto[]> {
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Creator or Admin role required');
    }

    const tracks = await this.prisma.track.findMany({
      orderBy: [{ isActive: 'asc' }, { updatedAt: 'desc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        isActive: true,
        enrollmentCount: true,
        updatedAt: true,
        _count: {
          select: {
            modules: true,
            content: user.role === UserRole.ADMIN
              ? true
              : { where: { creatorId: user.sub } },
          },
        },
      },
    });

    return tracks.map((track) => ({
      id: track.id,
      slug: track.slug,
      title: track.title,
      description: track.description,
      icon: track.icon,
      status: track.isActive ? 'PUBLISHED' : 'DRAFT',
      moduleCount: track._count.modules,
      contentCount: track._count.content,
      enrollmentCount: track.enrollmentCount,
      updatedAt: track.updatedAt.toISOString(),
    }));
  }

  async createCreatorCourse(
    user: JwtPayload,
    body: { title: string; slug: string; description: string; icon?: string },
  ): Promise<CreatorCourseDto> {
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Creator or Admin role required');
    }

    const maxTrack = await this.prisma.track.aggregate({ _max: { trackNumber: true } });
    const created = await this.prisma.track.create({
      data: {
        title: body.title,
        slug: normalizeCourseSlug(body.slug),
        description: body.description,
        icon: body.icon ?? 'BBT',
        trackNumber: (maxTrack._max.trackNumber ?? 0) + 1,
        isActive: false,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        icon: true,
        isActive: true,
        enrollmentCount: true,
        updatedAt: true,
      },
    });

    return {
      id: created.id,
      slug: created.slug,
      title: created.title,
      description: created.description,
      icon: created.icon,
      status: created.isActive ? 'PUBLISHED' : 'DRAFT',
      moduleCount: 0,
      contentCount: 0,
      enrollmentCount: created.enrollmentCount,
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  // ─── Learner feed ────────────────────────────────────────────────────────────

  async getFeed(userId: string, cursor?: string): Promise<{ items: unknown[]; nextCursor: string | null }> {
    const profile = await this.prisma.learnerProfile.findUnique({
      where: { userId },
      select: { currentTrackId: true, currentModuleId: true },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { learnerId: userId, status: EnrollmentStatus.ACTIVE },
      select: { trackId: true, plan: true },
    });
    const enrolledTrackIds = enrollments.map((e) => e.trackId);

    // Try ML service first (non-blocking — 3s timeout, falls back on any error)
    if (profile?.currentTrackId && !cursor) {
      const mlFeed = await this.ml.getFeed(
        userId,
        profile.currentTrackId,
        profile.currentModuleId ?? undefined,
        [],
        FEED_PAGE_SIZE,
      );
      if (mlFeed && mlFeed.items.length > 0) {
        return {
          items: mlFeed.items,
          nextCursor: mlFeed.items.length >= FEED_PAGE_SIZE
            ? (mlFeed.items[mlFeed.items.length - 1]?.id ?? null)
            : null,
        };
      }
    }

    // Fallback: internal Prisma-based feed
    const eventCountKey = `feed:events:${userId}`;
    const eventCount = parseInt((await this.redis.get(eventCountKey)) ?? '0', 10);
    const isColdStart = eventCount < COLD_START_THRESHOLD;

    let items: unknown[];
    if (isColdStart || !profile?.currentTrackId) {
      items = await this.getColdStartFeed(profile?.currentTrackId, profile?.currentModuleId, cursor);
    } else {
      items = await this.getBucketedFeed(
        userId,
        profile.currentTrackId,
        profile.currentModuleId ?? undefined,
        enrolledTrackIds,
        cursor,
      );
    }

    const nextCursor =
      items.length === FEED_PAGE_SIZE
        ? (items[items.length - 1] as { id: string }).id
        : null;

    return { items, nextCursor };
  }

  private async getColdStartFeed(
    trackId?: string | null,
    moduleId?: string | null,
    cursor?: string,
  ) {
    return this.prisma.content.findMany({
      where: {
        status: ContentStatus.APPROVED,
        ...(trackId ? { trackId } : {}),
        ...(moduleId ? { moduleId } : {}),
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      orderBy: { viewCount: 'desc' },
      take: FEED_PAGE_SIZE,
      select: this.contentSelect(),
    });
  }

  private async getBucketedFeed(
    _userId: string,
    currentTrackId: string,
    currentModuleId: string | undefined,
    enrolledTrackIds: string[],
    cursor?: string,
  ) {
    const cursorFilter = cursor ? { id: { lt: cursor } } : {};

    const [progression, reinforcement, adjacent, social] = await Promise.all([
      // PROGRESSION: current track/module, newest first
      this.prisma.content.findMany({
        where: { status: ContentStatus.APPROVED, trackId: currentTrackId, ...(currentModuleId ? { moduleId: currentModuleId } : {}), ...cursorFilter },
        orderBy: { createdAt: 'desc' },
        take: Math.ceil(FEED_PAGE_SIZE * BUCKET_WEIGHTS.PROGRESSION),
        select: this.contentSelect(),
      }),
      // REINFORCEMENT: same track, high view count (previously seen territory)
      this.prisma.content.findMany({
        where: { status: ContentStatus.APPROVED, trackId: currentTrackId, ...cursorFilter },
        orderBy: { viewCount: 'desc' },
        take: Math.ceil(FEED_PAGE_SIZE * BUCKET_WEIGHTS.REINFORCEMENT),
        select: this.contentSelect(),
      }),
      // ADJACENT: other enrolled tracks
      this.prisma.content.findMany({
        where: { status: ContentStatus.APPROVED, trackId: { in: enrolledTrackIds.filter((id) => id !== currentTrackId) }, ...cursorFilter },
        orderBy: { viewCount: 'desc' },
        take: Math.ceil(FEED_PAGE_SIZE * BUCKET_WEIGHTS.ADJACENT),
        select: this.contentSelect(),
      }),
      // SOCIAL: reels across platform (social bucket)
      this.prisma.content.findMany({
        where: { status: ContentStatus.APPROVED, type: ContentType.REEL, ...cursorFilter },
        orderBy: { shareCount: 'desc' },
        take: Math.ceil(FEED_PAGE_SIZE * BUCKET_WEIGHTS.SOCIAL),
        select: this.contentSelect(),
      }),
    ]);

    // Interleave buckets and deduplicate by id
    const seen = new Set<string>();
    const merged: unknown[] = [];

    const sources = [progression, reinforcement, adjacent, social];
    const maxLen = Math.max(...sources.map((s) => s.length));

    for (let i = 0; i < maxLen; i++) {
      for (const src of sources) {
        const item = src[i] as { id: string } | undefined;
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          merged.push(item);
        }
      }
    }

    return merged.slice(0, FEED_PAGE_SIZE);
  }

  private contentSelect() {
    return {
      id: true,
      type: true,
      title: true,
      description: true,
      muxPlaybackId: true,
      youtubeId: true,
      duration: true,
      thumbnailUrl: true,
      tags: true,
      tagMaps: { select: { tag: { select: { name: true, slug: true } } } },
      viewCount: true,
      saveCount: true,
      shareCount: true,
      trackId: true,
      moduleId: true,
      conceptId: true,
      createdAt: true,
      track: { select: { title: true, slug: true, icon: true } },
      creator: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          creatorProfile: { select: { displayName: true, tier: true, isVerified: true } },
        },
      },
    } as const;
  }

  // ─── Creator upload ──────────────────────────────────────────────────────────

  async createUpload(
    user: JwtPayload,
    body: {
      trackId: string;
      moduleId?: string;
      conceptId?: string;
      title: string;
      description?: string;
      type: ContentType;
      tags?: string[];
      quickReel?: boolean;
      durationSeconds?: number;
    },
  ) {
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Creator or Admin role required');
    }

    if (body.quickReel && body.type !== ContentType.REEL) {
      throw new BadRequestException({
        code: 'QUICK_REEL_REQUIRES_REEL',
        message: 'Quick Reel uploads must use REEL content type',
        field: 'type',
      });
    }

    if (body.type === ContentType.REEL && body.durationSeconds && body.durationSeconds > 60) {
      throw new BadRequestException({
        code: 'REEL_DURATION_LIMIT',
        message: 'Reels must be 60 seconds or shorter',
        field: 'durationSeconds',
      });
    }

    // Validate track exists
    const track = await this.prisma.track.findUnique({ where: { id: body.trackId } });
    if (!track) throw new NotFoundException('Track not found');

    // Create a Mux direct upload
    const upload = await this.mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'smart',
      },
      cors_origin: this.config.get<string>('FRONTEND_URL', '*'),
    });

    const normalizedTags = normalizeTags(body.tags ?? []);

    const content = await this.prisma.$transaction(async (tx) => {
      const created = await tx.content.create({
        data: {
          creatorId: user.sub,
          trackId: body.trackId,
          moduleId: body.moduleId ?? null,
          conceptId: body.conceptId ?? null,
          type: body.type,
          title: body.title,
          description: body.description ?? '',
          tags: normalizedTags.map((tag) => tag.name),
          muxAssetId: upload.id,
          status: ContentStatus.DRAFT,
        },
        select: { id: true, title: true, status: true, muxAssetId: true },
      });

      await this.attachTags(tx, created.id, normalizedTags);
      return created;
    });

    return { content, uploadUrl: upload.url };
  }

  // ─── Mux webhook ─────────────────────────────────────────────────────────────

  async handleMuxWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('MUX_WEBHOOK_SECRET', '');

    // Verify Mux signature using the instance webhooks helper
    await this.mux.webhooks.verifySignature(payload.toString(), { 'mux-signature': signature }, webhookSecret);

    const event = JSON.parse(payload.toString()) as {
      type: string;
      data: { id: string; playback_ids?: Array<{ id: string }>; duration?: number; status?: string };
    };

    const assetId = event.data.id;

    if (event.type === 'video.asset.ready') {
      const playbackId = event.data.playback_ids?.[0]?.id ?? null;
      const duration = event.data.duration ? Math.round(event.data.duration) : null;

      await this.prisma.content.updateMany({
        where: { muxAssetId: assetId },
        data: {
          muxPlaybackId: playbackId,
          duration,
          status: ContentStatus.PENDING_MODERATION,
        },
      });

      // Enqueue AI moderation job
      const content = await this.prisma.content.findFirst({
        where: { muxAssetId: assetId },
        select: { id: true, creatorId: true, transcript: true },
      });
      if (content) {
        await this.moderationQueue.add('screen', {
          contentId: content.id,
          creatorId: content.creatorId,
          muxAssetId: assetId,
          ...(content.transcript ? { transcript: content.transcript } : {}),
        });
      }
    } else if (event.type === 'video.asset.errored') {
      await this.prisma.content.updateMany({
        where: { muxAssetId: assetId },
        data: { status: ContentStatus.FAILED },
      });
    }
  }

  // ─── Analytics ───────────────────────────────────────────────────────────────

  async trackEvent(userId: string, dto: AnalyticsEventDto): Promise<void> {
    const pipeline = this.redis.pipeline();

    // Increment event counter for cold start detection
    const eventKey = `feed:events:${userId}`;
    pipeline.incr(eventKey);
    pipeline.expire(eventKey, 86400 * 30);

    if (dto.event === 'complete') {
      const completionKey = `progress:${userId}:content:${dto.contentId}`;
      pipeline.set(completionKey, '1', 'EX', 86400 * 365);
      pipeline.hincrby('stats:content:views', dto.contentId, 1);
    } else if (dto.event === 'share') {
      pipeline.hincrby('stats:content:shares', dto.contentId, 1);
    } else if (dto.event === 'save') {
      pipeline.hincrby('stats:content:saves', dto.contentId, 1);
    }

    await pipeline.exec();

    // Persist view/share/save counts to DB periodically (fire-and-forget)
    if (dto.event === 'complete' || dto.event === 'share' || dto.event === 'save') {
      void this.flushStatToDB(dto.contentId, dto.event);
    }

    // Stream event to ClickHouse for analytics (fire-and-forget, non-blocking)
    void this.writeClickHouseEvent(userId, dto);
  }

  async trackReelEvent(userId: string | null, dto: ReelAnalyticsEventDto): Promise<void> {
    if (dto.event === 'reel_view') {
      await this.prisma.content.update({
        where: { id: dto.contentId },
        data: { viewCount: { increment: 1 } },
      });
    } else if (dto.event === 'reel_share') {
      await this.prisma.content.update({
        where: { id: dto.contentId },
        data: { shareCount: { increment: 1 } },
      });
    }

    void this.writeClickHouseEvent(userId ?? 'anonymous', dto);
  }

  private async writeClickHouseEvent(userId: string, dto: AnalyticsEventDto | ReelAnalyticsEventDto): Promise<void> {
    const content = await this.prisma.content.findUnique({
      where: { id: dto.contentId },
      select: { trackId: true, moduleId: true },
    });
    this.clickhouse.insertContentEvent({
      user_id: userId,
      content_id: dto.contentId,
      track_id: content?.trackId ?? '',
      module_id: content?.moduleId ?? '',
      event: dto.event,
      position_seconds: dto.positionSeconds ?? 0,
      duration_seconds: dto.durationSeconds ?? 0,
    });
  }

  private async flushStatToDB(
    contentId: string,
    event: 'complete' | 'share' | 'save',
  ): Promise<void> {
    const field = event === 'complete' ? 'viewCount' : event === 'share' ? 'shareCount' : 'saveCount';
    await this.prisma.content.update({
      where: { id: contentId },
      data: { [field]: { increment: 1 } },
    });
  }

  private async attachTags(
    tx: Prisma.TransactionClient,
    contentId: string,
    tags: Array<{ name: string; slug: string }>,
  ): Promise<void> {
    for (const tag of tags) {
      const savedTag = await tx.contentTag.upsert({
        where: { slug: tag.slug },
        create: { name: tag.name, slug: tag.slug, useCount: 1 },
        update: { name: tag.name, useCount: { increment: 1 } },
        select: { id: true },
      });

      await tx.contentTagMap.upsert({
        where: { contentId_tagId: { contentId, tagId: savedTag.id } },
        create: { contentId, tagId: savedTag.id },
        update: {},
      });
    }
  }

  private activeChallengeWhere(): Prisma.ChallengeWhereInput {
    const now = new Date();
    return {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    };
  }

  private async getPinnedChallenge(): Promise<PinnedChallengeDto | null> {
    const challenge = await this.prisma.challenge.findFirst({
      where: {
        isPinned: true,
        ...this.activeChallengeWhere(),
      },
      orderBy: { startsAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        tag: { select: { name: true, slug: true } },
      },
    });

    return challenge;
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

function normalizeTags(values: string[]): Array<{ name: string; slug: string }> {
  const bySlug = new Map<string, { name: string; slug: string }>();
  for (const value of values) {
    const slug = normalizeTagSlug(value);
    const name = toDisplayTag(value);
    if (slug && name && !bySlug.has(slug)) bySlug.set(slug, { name, slug });
  }
  return [...bySlug.values()].slice(0, MAX_TAGS_PER_CONTENT);
}

function uniqueTags(values: string[]): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const value of values) {
    const name = toDisplayTag(value);
    const slug = normalizeTagSlug(value);
    if (name && slug && !seen.has(slug)) {
      seen.add(slug);
      tags.push(name);
    }
  }
  return tags;
}

function toCreatorTier(value: number | null | undefined): CreatorTier {
  if (value === 2) return 2;
  if (value && value >= 3) return 3;
  return 1;
}

function normalizeQualityScore(value: number | null | undefined): number {
  if (!value || value < 0) return 0;
  return value > 1 ? value / 100 : value;
}

function toDashboardStatus(status: ContentStatus): CreatorDashboardStatus {
  if (status === ContentStatus.FAILED) return 'REJECTED';
  return status;
}

function countFlaggedContent(items: Array<{ status: ContentStatus }>): number {
  return items.filter((item) =>
    item.status === ContentStatus.REJECTED || item.status === ContentStatus.FAILED,
  ).length;
}

function deriveTrackTags(title: string, slug: string): string[] {
  const text = `${title} ${slug}`.toLowerCase();
  if (text.includes('genai') || text.includes('agent') || text.includes('ai product')) {
    return ['GenAI', 'AgenticAI', 'PromptEngineering'];
  }
  if (text.includes('cloud') || text.includes('mlops')) return ['Cloud', 'MLOps', 'AWS'];
  if (text.includes('cyber')) return ['CyberSecurity', 'SOC', 'EthicalHacking'];
  if (text.includes('design') || text.includes('ui')) return ['UIUX', 'DesignSystems', 'BrandDesign'];
  if (text.includes('marketing') || text.includes('sales')) return ['AIMarketing', 'SalesOps', 'Growth'];
  if (text.includes('odoo') || text.includes('erp')) return ['Odoo', 'ERP', 'BusinessApps'];
  return [title, slug];
}

function normalizeCourseSlug(value: string): string {
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

function getUseCount(tag: object): number {
  if (!('useCount' in tag)) return 0;
  const value = (tag as { useCount: unknown }).useCount;
  return typeof value === 'number' ? value : 0;
}
