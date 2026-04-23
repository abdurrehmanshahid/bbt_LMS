import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const esUrl = this.config.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200');
    this.es = new Client({ node: esUrl });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureIndex().catch((err: unknown) => {
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

    await this.es.index({ index: INDEX, id: content.id, document: doc });
  }

  async removeContent(contentId: string): Promise<void> {
    await this.es.delete({ index: INDEX, id: contentId }).catch(() => undefined);
  }

  async search(
    q: string,
    opts: {
      trackId?: string;
      type?: string;
      after?: string;
      learnerTrackId?: string;
    } = {},
  ): Promise<SearchResult> {
    const PAGE = 20;

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

    const response = await this.es.search<ContentDoc>(searchParams);
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

    return { items, total, nextCursor, zeroResults };
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
    await this.es
      .update({
        index: INDEX,
        id: contentId,
        doc: { completionRate, saveRate },
      })
      .catch(() => undefined);
  }
}
