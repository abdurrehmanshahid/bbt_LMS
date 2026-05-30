import { Client } from '@elastic/elasticsearch';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContentStatus, ContentType, Prisma } from '@prisma/client';

import { ClickHouseService } from '../analytics/clickhouse.service';
import { PrismaService } from '../prisma/prisma.service';

const INDEX = 'bbt_content';

export interface SearchHit {
  id: string;
  title: string;
  description: string;
  type: string;
  track: string;
  trackId: string;
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  duration: number | null;
  creatorName: string;
  creatorTier: number;
  completionRate: number;
  saveRate: number;
  viewCount: number;
  tags: string[];
  score: number;
}

export interface SearchResult {
  items: SearchHit[];
  total: number;
  nextCursor: string | null;
  zeroResults: boolean;
}

interface ContentDoc {
  id: string;
  title: string;
  description: string;
  type: string;
  trackId: string;
  track: string;
  creatorId: string;
  creatorName: string;
  creatorTier: number;
  tags: string[];
  completionRate: number;
  saveRate: number;
  viewCount: number;
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  duration: number | null;
  status: string;
  indexedAt: string;
}

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private readonly es: Client;
  private elasticsearchAvailable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly clickhouse: ClickHouseService,
  ) {
    const esUrl = this.config.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200');
    this.es = new Client({ node: esUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex().then(() => {
      this.elasticsearchAvailable = true;
    }).catch((err: unknown) => {
      this.elasticsearchAvailable = false;
      this.logger.warn(`Elasticsearch not available at startup: ${String(err)}`);
    });
  }

  private async ensureIndex(): Promise<void> {
    const exists = await this.es.indices.exists({ index: INDEX });
    if (exists) return;

    await this.es.indices.create({
      index: INDEX,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'english',
            fields: { keyword: { type: 'keyword' } },
          },
          description: { type: 'text', analyzer: 'english' },
          transcript: { type: 'text', analyzer: 'english' },
          type: { type: 'keyword' },
          trackId: { type: 'keyword' },
          track: { type: 'keyword' },
          creatorId: { type: 'keyword' },
          creatorName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
          creatorTier: { type: 'integer' },
          tags: { type: 'keyword' },
          completionRate: { type: 'float' },
          saveRate: { type: 'float' },
          viewCount: { type: 'integer' },
          thumbnailUrl: { type: 'keyword', index: false },
          muxPlaybackId: { type: 'keyword', index: false },
          duration: { type: 'integer' },
          status: { type: 'keyword' },
          indexedAt: { type: 'date' },
        },
      },
    });

    this.logger.log(`Created Elasticsearch index: ${INDEX}`);
  }

  async indexContent(contentId: string): Promise<void> {
    if (!this.elasticsearchAvailable) return;

    const content = await this.prisma.content.findUnique({
      where: { id: contentId },
      include: {
        track: { select: { title: true } },
        creator: {
          select: {
            name: true,
            creatorProfile: { select: { tier: true } },
          },
        },
      },
    });

    if (!content || content.status !== 'APPROVED') return;

    const doc: ContentDoc = {
      id: content.id,
      title: content.title,
      description: content.description ?? '',
      type: content.type,
      trackId: content.trackId,
      track: content.track.title,
      creatorId: content.creatorId,
      creatorName: content.creator.name,
      creatorTier: content.creator.creatorProfile?.tier ?? 1,
      tags: content.tags,
      completionRate: 0,
      saveRate: 0,
      viewCount: content.viewCount,
      thumbnailUrl: content.thumbnailUrl,
      muxPlaybackId: content.muxPlaybackId,
      duration: content.duration,
      status: content.status,
      indexedAt: new Date().toISOString(),
    };

    await this.es.index({ index: INDEX, id: content.id, document: doc }).catch((err: unknown) => {
      this.elasticsearchAvailable = false;
      this.logger.warn(`Elasticsearch indexing failed: ${String(err)}`);
    });
  }

  async removeContent(contentId: string): Promise<void> {
    if (!this.elasticsearchAvailable) return;

    await this.es.delete({ index: INDEX, id: contentId }).catch(() => undefined);
  }

  async search(
    q: string,
    opts: {
      trackId?: string;
      type?: string;
      after?: string;
      learnerTrackId?: string;
      userId?: string;
    } = {},
  ): Promise<SearchResult> {
    const PAGE = 20;

    if (!this.elasticsearchAvailable) {
      return this.fallbackSearch(q, opts, PAGE);
    }

    const mustFilters: object[] = [{ term: { status: 'APPROVED' } }];
    if (opts.trackId) mustFilters.push({ term: { trackId: opts.trackId } });
    if (opts.type) mustFilters.push({ term: { type: opts.type } });

    const query = {
      function_score: {
        query: {
          bool: {
            must: mustFilters,
            should: q
              ? [
                  { match: { title: { query: q, boost: 3 } } },
                  { match: { description: { query: q, boost: 1.5 } } },
                  { match_phrase_prefix: { title: { query: q, boost: 2 } } },
                  { terms: { tags: q.split(/\s+/), boost: 2 } },
                ]
              : [],
            minimum_should_match: q ? 1 : 0,
          },
        },
        functions: [
          {
            field_value_factor: {
              field: 'completionRate',
              factor: 0.3,
              modifier: 'none',
              missing: 0,
            },
          },
          {
            field_value_factor: {
              field: 'saveRate',
              factor: 0.2,
              modifier: 'none',
              missing: 0,
            },
          },
          {
            filter: { term: { creatorTier: 3 } },
            weight: 1.5,
          },
          {
            filter: { term: { creatorTier: 2 } },
            weight: 1.2,
          },
          {
            gauss: {
              indexedAt: {
                origin: 'now',
                scale: '30d',
                decay: 0.5,
              },
            },
          },
        ],
        score_mode: 'sum',
        boost_mode: 'multiply',
      },
    };

    const searchParams: Record<string, unknown> = {
      index: INDEX,
      size: PAGE + 1,
      query,
      _source: true,
    };

    if (opts.after) {
      searchParams['search_after'] = [opts.after];
      searchParams['sort'] = [{ _score: 'desc' }, { id: 'asc' }];
    } else {
      searchParams['sort'] = [{ _score: 'desc' }, { id: 'asc' }];
    }

    const response = await this.es.search<ContentDoc>(searchParams).catch((err: unknown) => {
      this.elasticsearchAvailable = false;
      this.logger.warn(`Elasticsearch search failed; using database fallback: ${String(err)}`);
      return null;
    });

    if (!response) {
      return this.fallbackSearch(q, opts, PAGE);
    }

    const hits = response.hits.hits;
    const total = typeof response.hits.total === 'number'
      ? response.hits.total
      : (response.hits.total?.value ?? 0);

    const zeroResults = hits.length === 0;

    if (q) {
      await this.trackSearchGap(q, zeroResults ? 'zero_results' : 'low_engagement', zeroResults, total);
    }

    const hasMore = hits.length > PAGE;
    const items = hits.slice(0, PAGE).map((h) => {
      const s = h._source!;
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        type: s.type,
        track: s.track,
        trackId: s.trackId,
        thumbnailUrl: s.thumbnailUrl,
        muxPlaybackId: s.muxPlaybackId,
        duration: s.duration,
        creatorName: s.creatorName,
        creatorTier: s.creatorTier,
        completionRate: s.completionRate,
        saveRate: s.saveRate,
        viewCount: s.viewCount,
        tags: s.tags,
        score: h._score ?? 0,
      } satisfies SearchHit;
    });

    const lastHit = hits[PAGE - 1];
    const nextCursor = hasMore && lastHit ? String(lastHit._id) : null;

    // Log to ClickHouse for analytics (fire-and-forget)
    this.clickhouse.insertSearchEvent({
      user_id: opts.userId ?? '',
      query: q,
      track_id: opts.trackId ?? '',
      result_count: total,
      clicked_item_id: '',
      zero_results: zeroResults ? 1 : 0,
    });

    return { items, total, nextCursor, zeroResults };
  }

  private async fallbackSearch(
    q: string,
    opts: {
      trackId?: string;
      type?: string;
      after?: string;
      userId?: string;
    },
    pageSize: number,
  ): Promise<SearchResult> {
    const normalizedQuery = q.trim();
    const where: Prisma.ContentWhereInput = { status: ContentStatus.APPROVED };

    if (opts.trackId) where.trackId = opts.trackId;
    if (opts.type && this.isContentType(opts.type)) where.type = opts.type;
    if (opts.after) where.id = { gt: opts.after };

    if (normalizedQuery) {
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      where.AND = terms.map((term) => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { tags: { has: term } },
        ],
      }));
    }

    const [contents, total] = await this.prisma.$transaction([
      this.prisma.content.findMany({
        where,
        include: {
          track: { select: { title: true } },
          creator: {
            select: {
              name: true,
              creatorProfile: { select: { tier: true } },
            },
          },
        },
        orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
        take: pageSize + 1,
      }),
      this.prisma.content.count({ where }),
    ]);

    const zeroResults = contents.length === 0;
    if (normalizedQuery) {
      await this.trackSearchGap(normalizedQuery, zeroResults ? 'zero_results' : 'low_engagement', zeroResults, total);
    }

    this.clickhouse.insertSearchEvent({
      user_id: opts.userId ?? '',
      query: normalizedQuery,
      track_id: opts.trackId ?? '',
      result_count: total,
      clicked_item_id: '',
      zero_results: zeroResults ? 1 : 0,
    });

    const items = contents.slice(0, pageSize).map((content) => ({
      id: content.id,
      title: content.title,
      description: content.description,
      type: content.type,
      track: content.track.title,
      trackId: content.trackId,
      thumbnailUrl: content.thumbnailUrl,
      muxPlaybackId: content.muxPlaybackId,
      duration: content.duration,
      creatorName: content.creator.name,
      creatorTier: content.creator.creatorProfile?.tier ?? 1,
      completionRate: 0,
      saveRate: 0,
      viewCount: content.viewCount,
      tags: content.tags,
      score: this.fallbackScore(content.title, content.description, content.tags, normalizedQuery),
    }) satisfies SearchHit);

    const hasMore = contents.length > pageSize;
    const lastItem = items[items.length - 1];

    return {
      items,
      total,
      nextCursor: hasMore && lastItem ? lastItem.id : null,
      zeroResults,
    };
  }

  private isContentType(value: string): value is ContentType {
    return Object.values(ContentType).includes(value as ContentType);
  }

  private fallbackScore(title: string, description: string, tags: string[], query: string): number {
    if (!query) return 0;

    const lowerQuery = query.toLowerCase();
    let score = 0;
    if (title.toLowerCase().includes(lowerQuery)) score += 3;
    if (description.toLowerCase().includes(lowerQuery)) score += 1.5;
    if (tags.some((tag) => tag.toLowerCase().includes(lowerQuery))) score += 2;

    return score;
  }

  private async trackSearchGap(
    query: string,
    type: string,
    isZero: boolean,
    total: number,
  ): Promise<void> {
    if (!isZero && total > 3) return;

    await this.prisma.contentGap.upsert({
      where: { query_type: { query, type } },
      update: { count: { increment: 1 }, lastSeenAt: new Date() },
      create: { query, type, count: 1 },
    });
  }

  async syncEngagementStats(contentId: string, completionRate: number, saveRate: number): Promise<void> {
    if (!this.elasticsearchAvailable) return;

    await this.es
      .update({
        index: INDEX,
        id: contentId,
        doc: { completionRate, saveRate },
      })
      .catch(() => undefined);
  }
}
