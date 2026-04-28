import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

export interface MlFeedItem {
  id: string;
  title: string;
  type: string;
  trackId: string;
  moduleId: string | null;
  conceptId: string | null;
  muxPlaybackId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  bucket: 'progression' | 'reinforcement' | 'discovery' | 'social';
  score: number;
}

export interface MlFeedResponse {
  learnerId: string;
  items: MlFeedItem[];
  isColdStart: boolean;
  generatedAt: string;
}

@Injectable()
export class MlService {
  private readonly logger = new Logger(MlService.name);
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
    this.secret = this.config.get<string>('ML_INTERNAL_SECRET', '');
  }

  async getFeed(
    learnerId: string,
    trackId: string,
    currentModuleId: string | undefined,
    viewedContentIds: string[],
    limit: number,
  ): Promise<MlFeedResponse | null> {
    try {
      const response = await firstValueFrom(
        this.http
          .post<MlFeedResponse>(
            `${this.baseUrl}/feed`,
            { learnerId, trackId, currentModuleId, viewedContentIds, limit },
            { headers: { 'x-internal-secret': this.secret } },
          )
          .pipe(
            timeout(3000),
            catchError((err) => {
              this.logger.warn(`ML feed unavailable: ${err.message}`);
              return of(null);
            }),
          ),
      );
      return response?.data ?? null;
    } catch {
      return null;
    }
  }

  async triggerRetrain(): Promise<void> {
    try {
      await firstValueFrom(
        this.http
          .post(`${this.baseUrl}/admin/retrain`, {}, {
            headers: { 'x-internal-secret': this.secret },
          })
          .pipe(
            timeout(5000),
            catchError(() => of(null)),
          ),
      );
    } catch {
      // Non-critical — NestJS works without ML
    }
  }
}
