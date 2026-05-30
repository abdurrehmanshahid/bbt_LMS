import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectToxicContentCommand,
  type ToxicContent,
} from '@aws-sdk/client-comprehend';
import {
  RekognitionClient,
  StartContentModerationCommand,
  GetContentModerationCommand,
  type ModerationLabel,
} from '@aws-sdk/client-rekognition';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiModerationResult {
  flags: AiFlag[];
  confidence: number; // max confidence across all flags
  rawRekognition: ModerationLabel[];
  rawToxicity: ToxicContent[];
  sentiment: string;
}

export interface AiFlag {
  category: 'EXPLICIT' | 'VIOLENCE' | 'HATE_SPEECH' | 'SPAM' | 'OTHER';
  label: string;
  confidence: number;
  source: 'rekognition' | 'comprehend';
}


// Rekognition label → our category
const REKOGNITION_CATEGORY_MAP: Record<string, AiFlag['category']> = {
  'Explicit Nudity': 'EXPLICIT',
  'Nudity': 'EXPLICIT',
  'Graphic Male Nudity': 'EXPLICIT',
  'Graphic Female Nudity': 'EXPLICIT',
  'Sexual Activity': 'EXPLICIT',
  'Illustrated Explicit Nudity': 'EXPLICIT',
  'Adult Toys': 'EXPLICIT',
  'Violence': 'VIOLENCE',
  'Graphic Violence Or Gore': 'VIOLENCE',
  'Physical Violence': 'VIOLENCE',
  'Weapon Violence': 'VIOLENCE',
  'Weapons': 'VIOLENCE',
  'Self Injury': 'VIOLENCE',
  'Hate Symbols': 'HATE_SPEECH',
  'Nazi Party': 'HATE_SPEECH',
  'White Supremacy': 'HATE_SPEECH',
  'Extremist': 'HATE_SPEECH',
};

@Injectable()
export class ModerationAiService {
  private readonly logger = new Logger(ModerationAiService.name);
  private readonly rekognition: RekognitionClient;
  private readonly comprehend: ComprehendClient;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'ap-south-1');
    const credentials = {
      accessKeyId: this.config.get<string>('AWS_ACCESS_KEY_ID', ''),
      secretAccessKey: this.config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
    };

    this.rekognition = new RekognitionClient({ region, credentials });
    this.comprehend = new ComprehendClient({ region, credentials });
    this.bucketName = this.config.get<string>('AWS_S3_VIDEO_BUCKET', '');
  }

  // ── Main entry point ────────────────────────────────────────────────────────

  async screenContent(params: {
    muxAssetId: string;
    s3Key?: string;
    transcript?: string;
  }): Promise<AiModerationResult> {
    const [videoResult, textResult] = await Promise.all([
      params.s3Key ? this.screenVideo(params.s3Key) : Promise.resolve({ flags: [], labels: [] }),
      params.transcript ? this.screenText(params.transcript) : Promise.resolve({ flags: [], toxicity: [], sentiment: 'NEUTRAL' }),
    ]);

    const allFlags = [...videoResult.flags, ...textResult.flags];
    const maxConfidence = allFlags.length > 0
      ? Math.max(...allFlags.map((f) => f.confidence))
      : 0;

    this.logger.log(
      `AI screen: assetId=${params.muxAssetId} flags=${allFlags.length} maxConf=${maxConfidence.toFixed(2)}`,
    );

    return {
      flags: allFlags,
      confidence: maxConfidence,
      rawRekognition: videoResult.labels,
      rawToxicity: textResult.toxicity,
      sentiment: textResult.sentiment,
    };
  }

  // ── Video moderation via Rekognition ────────────────────────────────────────

  private async screenVideo(s3Key: string): Promise<{
    flags: AiFlag[];
    labels: ModerationLabel[];
  }> {
    if (!this.bucketName) {
      this.logger.warn('AWS_S3_VIDEO_BUCKET not configured — skipping Rekognition');
      return { flags: [], labels: [] };
    }

    try {
      // Start async job
      const startRes = await this.rekognition.send(
        new StartContentModerationCommand({
          Video: { S3Object: { Bucket: this.bucketName, Name: s3Key } },
          MinConfidence: 50,
        }),
      );
      const jobId = startRes.JobId;
      if (!jobId) return { flags: [], labels: [] };

      // Poll for completion (max 3 min for a typical short video)
      const labels = await this.pollRekognitionJob(jobId);
      const flags = this.mapRekognitionLabels(labels);
      return { flags, labels };
    } catch (err) {
      this.logger.warn(`Rekognition failed: ${(err as Error).message}`);
      return { flags: [], labels: [] };
    }
  }

  private async pollRekognitionJob(jobId: string, maxAttempts = 18): Promise<ModerationLabel[]> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 10_000)); // 10s between polls
      const res = await this.rekognition.send(
        new GetContentModerationCommand({ JobId: jobId, SortBy: 'TIMESTAMP' }),
      );
      if (res.JobStatus === 'SUCCEEDED') {
        return (res.ModerationLabels ?? [])
          .map((l) => l.ModerationLabel)
          .filter((l): l is ModerationLabel => l !== undefined);
      }
      if (res.JobStatus === 'FAILED') break;
    }
    return [];
  }

  private mapRekognitionLabels(labels: ModerationLabel[]): AiFlag[] {
    const seen = new Set<string>();
    const result: AiFlag[] = [];
    for (const l of labels) {
      if (!l.Name || l.Confidence === undefined || l.Confidence < 50) continue;
      const category = REKOGNITION_CATEGORY_MAP[l.Name] ?? 'OTHER';
      const key = `${category}:${l.Name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        category,
        label: l.Name,
        confidence: l.Confidence / 100,
        source: 'rekognition',
      });
    }
    return result;
  }

  // ── Text moderation via Comprehend ──────────────────────────────────────────

  private async screenText(transcript: string): Promise<{
    flags: AiFlag[];
    toxicity: ToxicContent[];
    sentiment: string;
  }> {
    // Comprehend has a 5000 byte limit per call
    const text = transcript.slice(0, 4500);

    try {
      const [sentimentRes, toxicityRes] = await Promise.all([
        this.comprehend.send(
          new DetectSentimentCommand({ Text: text, LanguageCode: 'en' }),
        ),
        this.comprehend.send(
          new DetectToxicContentCommand({
            TextSegments: [{ Text: text }],
            LanguageCode: 'en',
          }),
        ).catch(() => ({ ResultList: [] as { Labels?: ToxicContent[] }[] })),
      ]);

      const toxicLabels: ToxicContent[] = (toxicityRes.ResultList ?? [])
        .flatMap((r) => r.Labels ?? []);

      const flags: AiFlag[] = toxicLabels
        .filter((l) => (l.Score ?? 0) >= 0.5)
        .map((l) => ({
          category: this.mapToxicCategory(l.Name ?? ''),
          label: l.Name ?? 'TOXIC',
          confidence: l.Score ?? 0,
          source: 'comprehend' as const,
        }));

      return {
        flags,
        toxicity: toxicLabels,
        sentiment: sentimentRes.Sentiment ?? 'NEUTRAL',
      };
    } catch (err) {
      this.logger.warn(`Comprehend failed: ${(err as Error).message}`);
      return { flags: [], toxicity: [], sentiment: 'NEUTRAL' };
    }
  }

  private mapToxicCategory(name: string): AiFlag['category'] {
    const lower = name.toLowerCase();
    if (lower.includes('sexual') || lower.includes('explicit')) return 'EXPLICIT';
    if (lower.includes('violence') || lower.includes('graphic')) return 'VIOLENCE';
    if (lower.includes('hate') || lower.includes('insult') || lower.includes('slur')) return 'HATE_SPEECH';
    if (lower.includes('spam') || lower.includes('promotion')) return 'SPAM';
    return 'OTHER';
  }
}
