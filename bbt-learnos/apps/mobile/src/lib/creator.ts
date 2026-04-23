import { authedFetch, authedPost } from './api';

export interface CreatorKpis {
  totalViews: number;
  totalRevenue: number;
  currency: string;
  pendingPayout: number;
  publishedCount: number;
  avgCompletionRate: number;
}

export interface ContentRow {
  id: string;
  title: string;
  status: string;
  views: number;
  completionRate: number;
  uploadedAt: string;
}

export interface ModerationItem {
  id: string;
  title: string;
  status: 'REJECTED' | 'HELD';
  track: string;
  rejectionReason: string;
  feedback: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  totalWatchMinutes: number;
  avgCompletionRate: number;
  viewSeries: Array<{ date: string; views: number }>;
}

export const creatorApi = {
  getKpis: (token: string) =>
    authedFetch<CreatorKpis>('/creator/kpis', token),

  getContent: (token: string) =>
    authedFetch<ContentRow[]>('/creator/content', token),

  initUpload: (token: string) =>
    authedPost<{ uploadUrl: string; contentId: string }>('/creator/upload/init', token),

  submitMetadata: (token: string, contentId: string, meta: Record<string, unknown>) =>
    authedPost<void>(`/creator/content/${contentId}/metadata`, token, meta),

  getAnalytics: (token: string, period: string) =>
    authedFetch<AnalyticsSummary>('/creator/analytics', token, { period }),

  getModerationInbox: (token: string) =>
    authedFetch<ModerationItem[]>('/creator/moderation-inbox', token),

  resubmit: (token: string, id: string) =>
    authedPost<void>(`/creator/content/${id}/resubmit`, token),

  appeal: (token: string, id: string) =>
    authedPost<void>(`/creator/content/${id}/appeal`, token),
};
