import { ConfigService } from '@nestjs/config';
import { ContentStatus, ContentType } from '@prisma/client';

import { ClickHouseService } from '../analytics/clickhouse.service';
import { PrismaService } from '../prisma/prisma.service';

import { SearchService } from './search.service';

const mockContent = {
  id: 'content-1',
  title: 'AI Marketing Basics',
  description: 'Practical AI workflows for campaign teams',
  type: ContentType.REEL,
  trackId: 'track-1',
  thumbnailUrl: null,
  muxPlaybackId: null,
  duration: 120,
  viewCount: 42,
  tags: ['ai', 'marketing'],
  track: { title: 'AI Marketing' },
  creator: {
    name: 'Creator One',
    creatorProfile: { tier: 2 },
  },
};

describe('SearchService', () => {
  const findMany = jest.fn();
  const count = jest.fn();
  const upsert = jest.fn();
  const insertSearchEvent = jest.fn();

  const prisma = {
    content: { findMany, count },
    contentGap: { upsert },
    $transaction: jest.fn((queries: Promise<unknown>[]) => Promise.all(queries)),
  } as unknown as PrismaService;

  const config = {
    get: jest.fn((_: string, fallback?: string) => fallback ?? ''),
  } as unknown as ConfigService;

  const clickhouse = {
    insertSearchEvent,
  } as unknown as ClickHouseService;

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([mockContent]);
    count.mockResolvedValue(1);
    upsert.mockResolvedValue({ query: 'ai', type: 'low_engagement', count: 1 });
  });

  it('falls back to Prisma content search when Elasticsearch is unavailable', async () => {
    const service = new SearchService(prisma, config, clickhouse);

    const result = await service.search('ai', { trackId: 'track-1', userId: 'user-1' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ContentStatus.APPROVED,
          trackId: 'track-1',
        }),
        take: 21,
      }),
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'content-1',
          title: 'AI Marketing Basics',
          type: ContentType.REEL,
          track: 'AI Marketing',
          creatorName: 'Creator One',
          creatorTier: 2,
        }),
      ],
      total: 1,
      nextCursor: null,
      zeroResults: false,
    });
    expect(insertSearchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        query: 'ai',
        track_id: 'track-1',
        result_count: 1,
        zero_results: 0,
      }),
    );
  });
});
