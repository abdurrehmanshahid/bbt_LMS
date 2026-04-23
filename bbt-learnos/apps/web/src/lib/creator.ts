const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

async function authedFetch<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function authedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export type ContentStatus = 'PENDING_MODERATION' | 'APPROVED' | 'REJECTED' | 'DRAFT' | 'HELD';
export type ContentType = 'REEL' | 'LECTURE' | 'LIVE_RECORDING' | 'RESOURCE';

export interface CreatorKpis {
  views30d: number;
  completionRate: number;
  revenueMonth: number;
  currency: string;
  subscriberCount: number;
  tier: 1 | 2 | 3;
  qualityScore: number;
  moderationFlags: number;
}

export interface ContentRow {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  views: number;
  completionRate: number;
  saveRate: number;
  track: string;
  createdAt: string;
}

export interface DashboardData {
  kpis: CreatorKpis;
  recentContent: ContentRow[];
}

export interface UploadInitResponse {
  contentId: string;
  uploadUrl: string;
}

export interface AnalyticsRow {
  contentId: string;
  title: string;
  views: number;
  watchMinutes: number;
  completionRate: number;
  saveRate: number;
  assessmentPassRate: number | null;
  revenueAttributed: number;
}

export interface AnalyticsData {
  period: '7d' | '30d' | '90d';
  viewSeries: Array<{ date: string; views: number }>;
  completionByContent: Array<{ title: string; rate: number }>;
  revenueByType: Array<{ type: string; amount: number }>;
  rows: AnalyticsRow[];
  audience: { topCountries: Array<{ country: string; pct: number }>; devices: Record<string, number> };
}

export interface ModerationItem {
  id: string;
  title: string;
  status: 'REJECTED' | 'HELD';
  rejectionReason: string;
  feedback: string;
  timestampReference: string | null;
  createdAt: string;
  track: string;
  type: ContentType;
}

export interface RevenueData {
  totalEarned: number;
  pendingPayout: number;
  paidOut: number;
  currency: string;
  minPayoutThreshold: number;
  breakdown: Array<{ source: string; amount: number }>;
  history: Array<{ id: string; amount: number; paidAt: string; method: string; status: string }>;
}

export const creatorApi = {
  getDashboard: (token: string) =>
    authedFetch<DashboardData>('/creator/dashboard', token),

  getContent: (token: string) =>
    authedFetch<ContentRow[]>('/creator/content', token),

  initUpload: (token: string, filename: string, filesize: number) =>
    authedPost<UploadInitResponse>('/creator/upload', token, { filename, filesize }),

  submitMetadata: (token: string, contentId: string, meta: {
    title: string; trackId: string; type: ContentType; moduleId?: string;
    conceptTags: string[]; description: string;
  }) => authedPost<{ status: ContentStatus }>(`/creator/content/${contentId}/metadata`, token, meta),

  getAnalytics: (token: string, period: '7d' | '30d' | '90d') =>
    authedFetch<AnalyticsData>('/creator/analytics', token, { period }),

  getModerationInbox: (token: string) =>
    authedFetch<ModerationItem[]>('/creator/moderation-inbox', token),

  resubmit: (token: string, contentId: string) =>
    authedPost<void>(`/creator/content/${contentId}/resubmit`, token, {}),

  appeal: (token: string, contentId: string) =>
    authedPost<void>(`/creator/content/${contentId}/appeal`, token, {}),

  getRevenue: (token: string) =>
    authedFetch<RevenueData>('/creator/revenue', token),

  requestPayout: (token: string) =>
    authedPost<void>('/creator/revenue/payout', token, {}),
};
