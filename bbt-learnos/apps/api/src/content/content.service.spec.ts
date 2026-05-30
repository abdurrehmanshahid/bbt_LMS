import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentStatus, ContentType, UserRole } from '@prisma/client';
import type { Queue } from 'bullmq';

import { ClickHouseService } from '../analytics/clickhouse.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MlService } from '../ml/ml.service';
import type { ModerationJobData } from '../moderation/moderation.processor';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import { ContentService } from './content.service';

const makePrisma = (): PrismaService => {
  let prisma: Record<string, unknown>;
  prisma = {
    content: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'content-1',
        trackId: 'track-1',
        moduleId: null,
      }),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'content-1',
          type: ContentType.REEL,
          title: 'Use embeddings in 60 seconds',
          description: 'A short AI lesson',
          tags: ['GenAI'],
        },
      ]),
      update: jest.fn().mockResolvedValue({ id: 'content-1' }),
      create: jest.fn().mockResolvedValue({
        id: 'content-1',
        title: 'Quick AI reel',
        status: ContentStatus.DRAFT,
        muxAssetId: 'upload-1',
      }),
      aggregate: jest.fn().mockResolvedValue({ _sum: { viewCount: 120 } }),
    },
    creatorProfile: {
      findUnique: jest.fn().mockResolvedValue({ tier: 2, qualityScore: 0.86, moderationFlags: 1 }),
    },
    follow: {
      count: jest.fn().mockResolvedValue(9),
    },
    contentTag: {
      findMany: jest.fn().mockResolvedValue([{ id: 'tag-1', name: 'GenAI', slug: 'genai', useCount: 3, challenges: [] }]),
      findUnique: jest.fn().mockResolvedValue({ id: 'tag-1', name: 'GenAI', slug: 'genai' }),
      upsert: jest.fn().mockResolvedValue({ id: 'tag-1', name: 'GenAI', slug: 'genai' }),
    },
    contentTagMap: {
      groupBy: jest.fn().mockResolvedValue([{ tagId: 'tag-1', _count: { contentId: 3 } }]),
      upsert: jest.fn().mockResolvedValue({ contentId: 'content-1', tagId: 'tag-1' }),
    },
    challenge: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
    track: {
      findUnique: jest.fn().mockResolvedValue({ id: 'track-1' }),
    },
    $transaction: jest.fn(async (callback: (tx: PrismaService) => Promise<unknown>): Promise<unknown> =>
      callback(prisma as unknown as PrismaService),
    ),
  };

  return prisma as unknown as PrismaService;
};

const makeService = (prisma = makePrisma()) => {
  const service = new ContentService(
    prisma,
    { get: jest.fn(), pipeline: jest.fn() } as unknown as RedisService,
    { get: jest.fn((_key: string, fallback?: string) => fallback ?? '') } as unknown as ConfigService,
    { getFeed: jest.fn() } as unknown as MlService,
    { insertContentEvent: jest.fn() } as unknown as ClickHouseService,
    { add: jest.fn() } as unknown as Queue<ModerationJobData>,
  );

  (service as unknown as { mux: { video: { uploads: { create: jest.Mock } } } }).mux = {
    video: {
      uploads: {
        create: jest.fn().mockResolvedValue({ id: 'upload-1', url: 'https://upload.example.test' }),
      },
    },
  };

  return service;
};

describe('ContentService shorts and reels', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns public approved reels ordered for the shorts feed', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await expect(service.getShortsFeed()).resolves.toMatchObject({
      items: [{ id: 'content-1', type: ContentType.REEL }],
      nextCursor: null,
    });

    expect(prisma.content.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: ContentStatus.APPROVED, type: ContentType.REEL },
        orderBy: [
          { shareCount: 'desc' },
          { saveCount: 'desc' },
          { viewCount: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
    );
  });

  it('returns trending hashtags from recent tag usage', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await expect(service.getTrendingTags()).resolves.toMatchObject({
      tags: [{ name: 'GenAI', slug: 'genai', count: 3 }],
      pinnedChallenge: null,
    });

    expect(prisma.contentTagMap.groupBy).toHaveBeenCalled();
  });

  it('returns creator dashboard metrics and recent content rows', async () => {
    const prisma = makePrisma();
    const contentFindMany = (prisma as unknown as { content: { findMany: jest.Mock } }).content.findMany;
    contentFindMany.mockResolvedValueOnce([
      {
        id: 'content-1',
        title: 'Use embeddings in 60 seconds',
        type: ContentType.REEL,
        status: ContentStatus.APPROVED,
        viewCount: 100,
        saveCount: 25,
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        track: { title: 'AI Product Builder' },
      },
    ]);
    const service = makeService(prisma);
    const user: JwtPayload = {
      sub: 'creator-1',
      role: UserRole.CREATOR,
      tier: 2,
      sessionId: 'session-1',
      jti: 'jwt-1',
    };

    await expect(service.getCreatorDashboard(user)).resolves.toMatchObject({
      kpis: {
        views30d: 120,
        subscriberCount: 9,
        tier: 2,
        qualityScore: 0.86,
        moderationFlags: 1,
      },
      recentContent: [
        {
          id: 'content-1',
          title: 'Use embeddings in 60 seconds',
          status: 'APPROVED',
          views: 100,
          saveRate: 0.25,
          track: 'AI Product Builder',
          createdAt: '2026-05-01T10:00:00.000Z',
        },
      ],
    });
  });

  it('rejects Quick Reel uploads when the content type is not REEL', async () => {
    const service = makeService();
    const user: JwtPayload = {
      sub: 'creator-1',
      role: UserRole.CREATOR,
      tier: 1,
      sessionId: 'session-1',
      jti: 'jwt-1',
    };

    await expect(
      service.createUpload(user, {
        trackId: 'track-1',
        title: 'Wrong quick upload',
        type: ContentType.LECTURE,
        quickReel: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('tracks anonymous reel view events without exposing learner identity', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await service.trackReelEvent(null, { contentId: 'content-1', event: 'reel_view' });

    expect(prisma.content.update).toHaveBeenCalledWith({
      where: { id: 'content-1' },
      data: { viewCount: { increment: 1 } },
    });
  });
});
