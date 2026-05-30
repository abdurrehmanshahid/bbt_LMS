import { createClient, type ClickHouseClient } from '@clickhouse/client';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ContentEventRow {
  user_id: string;
  content_id: string;
  track_id: string;
  module_id: string;
  event: 'play' | 'pause' | 'complete' | 'seek' | 'share' | 'save' | 'reel_view' | 'reel_complete' | 'reel_share';
  position_seconds: number;
  duration_seconds: number;
}

export interface SearchEventRow {
  user_id: string;
  query: string;
  track_id: string;
  result_count: number;
  clicked_item_id: string;
  zero_results: 0 | 1;
}

export interface ContentPerformanceRow {
  content_id: string;
  completions: number;
  plays: number;
  saves: number;
  shares: number;
  avg_watch_seconds: number;
  completion_rate: number;
}

export interface DailyActiveRow {
  date: string;
  dau: number;
}

const DDL_DATABASE = `CREATE DATABASE IF NOT EXISTS bbt_analytics`;

const DDL_CONTENT_EVENTS = `
CREATE TABLE IF NOT EXISTS bbt_analytics.content_events (
  event_id   UUID          DEFAULT generateUUIDv4(),
  user_id    String,
  content_id String,
  track_id   String,
  module_id  String,
  event      LowCardinality(String),
  position_seconds UInt32  DEFAULT 0,
  duration_seconds UInt32  DEFAULT 0,
  ts         DateTime      DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, content_id, ts)
TTL ts + INTERVAL 2 YEAR`;

const DDL_SEARCH_EVENTS = `
CREATE TABLE IF NOT EXISTS bbt_analytics.search_events (
  event_id      UUID   DEFAULT generateUUIDv4(),
  user_id       String,
  query         String,
  track_id      String,
  result_count  UInt32 DEFAULT 0,
  clicked_item_id String DEFAULT '',
  zero_results  UInt8  DEFAULT 0,
  ts            DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts)
TTL ts + INTERVAL 1 YEAR`;

@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  private client: ClickHouseClient | null = null;
  private ready = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('CLICKHOUSE_URL', '');
    if (!url) {
      this.logger.warn('CLICKHOUSE_URL not set — analytics events will be skipped');
      return;
    }

    try {
      this.client = createClient({
        url,
        username: this.config.get<string>('CLICKHOUSE_USER', 'default'),
        password: this.config.get<string>('CLICKHOUSE_PASSWORD', ''),
        request_timeout: 5000,
        clickhouse_settings: { async_insert: 1, wait_for_async_insert: 0 },
      });

      await this.client.exec({ query: DDL_DATABASE });
      await this.client.exec({ query: DDL_CONTENT_EVENTS });
      await this.client.exec({ query: DDL_SEARCH_EVENTS });

      this.ready = true;
      this.logger.log('ClickHouse connected — tables ready');
    } catch (err) {
      this.logger.warn(`ClickHouse unavailable at startup: ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  // ── Write paths (fire-and-forget) ───────────────────────────────────────────

  insertContentEvent(row: ContentEventRow): void {
    if (!this.ready || !this.client) return;
    void this.client
      .insert({ table: 'bbt_analytics.content_events', values: [row], format: 'JSONEachRow' })
      .catch((err: unknown) => this.logger.warn(`CH content_event insert: ${String(err)}`));
  }

  insertSearchEvent(row: SearchEventRow): void {
    if (!this.ready || !this.client) return;
    void this.client
      .insert({ table: 'bbt_analytics.search_events', values: [row], format: 'JSONEachRow' })
      .catch((err: unknown) => this.logger.warn(`CH search_event insert: ${String(err)}`));
  }

  // ── Read paths (admin analytics) ────────────────────────────────────────────

  async queryContentPerformance(days: number): Promise<ContentPerformanceRow[]> {
    if (!this.ready || !this.client) return [];

    const result = await this.client.query({
      query: `
        SELECT
          content_id,
          countIf(event = 'complete')                             AS completions,
          countIf(event = 'play')                                 AS plays,
          countIf(event = 'save')                                 AS saves,
          countIf(event = 'share')                                AS shares,
          avgIf(position_seconds, event = 'complete')             AS avg_watch_seconds,
          if(countIf(event = 'play') > 0,
             countIf(event = 'complete') / countIf(event = 'play'), 0) AS completion_rate
        FROM bbt_analytics.content_events
        WHERE ts >= now() - INTERVAL {days:UInt32} DAY
        GROUP BY content_id
        ORDER BY completions DESC
        LIMIT 50
      `,
      query_params: { days },
      format: 'JSONEachRow',
    });

    return result.json<ContentPerformanceRow>();
  }

  async queryDailyActiveUsers(days: number): Promise<DailyActiveRow[]> {
    if (!this.ready || !this.client) return [];

    const result = await this.client.query({
      query: `
        SELECT
          toDate(ts)          AS date,
          uniqExact(user_id)  AS dau
        FROM bbt_analytics.content_events
        WHERE ts >= now() - INTERVAL {days:UInt32} DAY
        GROUP BY date
        ORDER BY date ASC
      `,
      query_params: { days },
      format: 'JSONEachRow',
    });

    return result.json<DailyActiveRow>();
  }

  async queryTopSearches(days: number): Promise<Array<{ query: string; count: number; zero_rate: number }>> {
    if (!this.ready || !this.client) return [];

    const result = await this.client.query({
      query: `
        SELECT
          query,
          count()                                   AS count,
          avgIf(1, zero_results = 1)                AS zero_rate
        FROM bbt_analytics.search_events
        WHERE ts >= now() - INTERVAL {days:UInt32} DAY
          AND query != ''
        GROUP BY query
        ORDER BY count DESC
        LIMIT 50
      `,
      query_params: { days },
      format: 'JSONEachRow',
    });

    return result.json<{ query: string; count: number; zero_rate: number }>();
  }
}
