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

// ── Moderation ──────────────────────────────────────────────────────────────

export interface AiFlag { category: string; confidence: number }

export interface ModerationQueueItem {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  transcript: string | null;
  track: string;
  type: string;
  uploadedAt: string;
  creatorName: string;
  creatorTier: 1 | 2 | 3;
  creatorFlags: number;
  aiFlags: AiFlag[];
  aiSuggestedFeedback: string | null;
}

export type ModerationDecision = 'APPROVED' | 'HELD' | 'REJECTED';
export type RejectionReason = 'AUDIO_QUALITY' | 'OFF_TRACK' | 'INCOMPLETE' | 'QUALITY_LOW' | 'POLICY';

export const REJECTION_REASONS: Array<{ value: RejectionReason; label: string }> = [
  { value: 'AUDIO_QUALITY', label: 'Poor audio quality' },
  { value: 'OFF_TRACK', label: 'Off-track content' },
  { value: 'INCOMPLETE', label: 'Incomplete / cut off' },
  { value: 'QUALITY_LOW', label: 'Low production quality' },
  { value: 'POLICY', label: 'Policy violation' },
];

// ── Health ───────────────────────────────────────────────────────────────────

export interface PlatformHealth {
  dau: number; wau: number; mau: number;
  dauSpark: number[]; wauSpark: number[];
  activeSubsByTrack: Array<{ track: string; count: number }>;
  mrr: number; mrrDelta: number; currency: string;
  pipeline: { pending: number; approved: number; rejected: number };
  cohortCompletion: Array<{ track: string; rate: number }>;
  churnByTrack: Array<{ track: string; count: number }>;
  topSupportReasons: Array<{ reason: string; count: number }>;
}

// ── Users ────────────────────────────────────────────────────────────────────

export interface UserRow {
  id: string; name: string; email: string; role: string;
  isActive: boolean; emailVerified: boolean;
  enrolledTrack: string | null; subscriptionTier: string | null;
  createdAt: string; lastActiveAt: string | null;
}

export interface UserDetail extends UserRow {
  enrollments: Array<{ trackTitle: string; plan: string; status: string; startDate: string }>;
  payments: Array<{ amount: number; currency: string; gateway: string; status: string; createdAt: string }>;
  moderationInteractions: Array<{ contentTitle: string; decision: string; createdAt: string }>;
}

export type SuspendDuration = 7 | 14 | 30 | 60;

// ── Creator tier ─────────────────────────────────────────────────────────────

export interface TierReviewItem {
  creatorId: string;
  name: string;
  avatarUrl: string | null;
  currentTier: 1 | 2;
  qualityScore: number;
  flags: number;
  topContent: Array<{ id: string; title: string; completionRate: number; thumbnailUrl: string | null }>;
  credentials: string | null;
  appliedAt: string;
}

// ── Gaps ─────────────────────────────────────────────────────────────────────

export interface GapRow {
  query: string; count: number; type: 'zero_results' | 'low_engagement';
  suggestedTrack: string | null;
}

// ── Franchises ───────────────────────────────────────────────────────────────

export interface FranchiseRow {
  id: string; name: string; city: string;
  activeLearners: number; completionRate: number;
  complianceStatus: 'green' | 'yellow' | 'red';
  revenueMonth: number; currency: string;
  psda: string; navttc: string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const adminApi = {
  getModerationQueue: (token: string) =>
    authedFetch<ModerationQueueItem[]>('/admin/moderation', token),

  moderate: (token: string, contentId: string, decision: ModerationDecision, payload?: {
    reason?: RejectionReason; feedback?: string; timestampRef?: string;
  }) => authedPost<void>(`/admin/moderation/${contentId}`, token, { decision, ...payload }),

  getHealth: (token: string) =>
    authedFetch<PlatformHealth>('/admin/health', token),

  getUsers: (token: string, params: Record<string, string>) =>
    authedFetch<{ rows: UserRow[]; total: number }>('/admin/users', token, params),

  getUserDetail: (token: string, userId: string) =>
    authedFetch<UserDetail>(`/admin/users/${userId}`, token),

  userAction: (token: string, userId: string, action: string, payload?: Record<string, unknown>) =>
    authedPost<void>(`/admin/users/${userId}/action`, token, { action, ...payload }),

  getTierReviewQueue: (token: string) =>
    authedFetch<TierReviewItem[]>('/admin/creators/tier-review', token),

  decideTier: (token: string, creatorId: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE', reason?: string) =>
    authedPost<void>(`/admin/creators/${creatorId}/tier-decision`, token, { decision, reason }),

  getGaps: (token: string) =>
    authedFetch<GapRow[]>('/admin/gaps', token),

  getFranchises: (token: string) =>
    authedFetch<FranchiseRow[]>('/admin/franchises', token),
};
