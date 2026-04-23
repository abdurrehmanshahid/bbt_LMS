export enum ContentType {
  REEL = 'REEL',
  LECTURE = 'LECTURE',
  LIVE_RECORDING = 'LIVE_RECORDING',
  RESOURCE = 'RESOURCE',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PENDING_MODERATION = 'PENDING_MODERATION',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum FeedBucket {
  PROGRESSION = 'PROGRESSION',
  REINFORCEMENT = 'REINFORCEMENT',
  ADJACENT = 'ADJACENT',
  SOCIAL = 'SOCIAL',
}

export interface ContentDto {
  id: string;
  creatorId: string;
  trackId: string;
  moduleId: string | null;
  conceptId: string | null;
  type: ContentType;
  title: string;
  description: string;
  muxPlaybackId: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  status: ContentStatus;
  tags: string[];
  viewCount: number;
  saveCount: number;
  shareCount: number;
  createdAt: Date;
}

export interface FeedItemDto {
  content: ContentDto;
  score: number;
  bucket: FeedBucket;
  reason: string;
}
