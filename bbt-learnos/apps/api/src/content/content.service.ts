import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  ContentStatus,
  ContentType,
  EnrollmentStatus,
  UserRole,
} from '@prisma/client';
import Mux from '@mux/mux-node';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MlService } from '../ml/ml.service';
import { ClickHouseService } from '../analytics/clickhouse.service';
import type { ModerationJobData } from '../moderation/moderation.processor';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

// Feed bucket weights
const BUCKET_WEIGHTS = {
  PROGRESSION: 0.4,
  REINFORCEMENT: 0.3,
  ADJACENT: 0.2,
  SOCIAL: 0.1,
} as const;

const FEED_PAGE_SIZE = 20;
const COLD_START_THRESHOLD = 20;

export interface AnalyticsEventDto {
  contentId: string;
  event: 'play' | 'pause' | 'complete' | 'seek' | 'share' | 'save';
  positionSeconds?: number;
  durationSeconds?: number;
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
      duration: true,
      thumbnailUrl: true,
      tags: true,
      viewCount: true,
      saveCount: true,
      shareCount: true,
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
    } as const;
  }

  // ─── Creator upload ──────────────────────────────────────────────────────────

  async createUpload(
    user: JwtPayload,
    body: { trackId: string; moduleId?: string; conceptId?: string; title: string; description: string; type: ContentType; tags?: string[] },
  ) {
    if (user.role !== UserRole.CREATOR && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Creator or Admin role required');
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

    // Create content record in DRAFT state
    const content = await this.prisma.content.create({
      data: {
        creatorId: user.sub,
        trackId: body.trackId,
        moduleId: body.moduleId ?? null,
        conceptId: body.conceptId ?? null,
        type: body.type,
        title: body.title,
        description: body.description,
        tags: body.tags ?? [],
        muxAssetId: upload.id,
        status: ContentStatus.DRAFT,
      },
      select: { id: true, title: true, status: true, muxAssetId: true },
    });

    return { content, uploadUrl: upload.url };
  }

  // ─── Mux webhook ─────────────────────────────────────────────────────────────

  async handleMuxWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('MUX_WEBHOOK_SECRET', '');

    // Verify Mux signature using the instance webhooks helper
    this.mux.webhooks.verifySignature(payload.toString(), { 'mux-signature': signature }, webhookSecret);

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

  private async writeClickHouseEvent(userId: string, dto: AnalyticsEventDto): Promise<void> {
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
}
