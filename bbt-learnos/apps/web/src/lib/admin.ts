const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

async function apiError(res: Response): Promise<Error> {
  const text = await res.text().catch(() => '');
  if (!text) return new Error(`API error ${res.status}`);
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === 'object') {
      const body = parsed as { code?: unknown; message?: unknown; error?: unknown };
      const code = typeof body.code === 'string' ? body.code : undefined;
      const message = typeof body.message === 'string' ? body.message : undefined;
      const error = typeof body.error === 'string' ? body.error : undefined;
      return new Error([code, message ?? error].filter(Boolean).join(': ') || `API error ${res.status}`);
    }
  } catch {
    return new Error(text);
  }
  return new Error(`API error ${res.status}`);
}

async function authedFetch<T>(path: string, token: string, params?: Record<string, string>): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw await apiError(res);
  return res.json() as Promise<T>;
}

async function authedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res);
  return res.json() as Promise<T>;
}

async function authedPatch<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await apiError(res);
  return res.json() as Promise<T>;
}

async function authedDelete(path: string, token: string): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok && res.status !== 204) throw await apiError(res);
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
  enrollments: Array<{ trackId: string; trackTitle: string; plan: string; status: string; startDate: string }>;
  payments: Array<{ amount: number; currency: string; gateway: string; status: string; createdAt: string }>;
  moderationInteractions: Array<{ contentTitle: string; decision: string; createdAt: string }>;
}

export type SuspendDuration = 7 | 14 | 30 | 60;
export type UserRole = 'LEARNER' | 'CREATOR' | 'ADMIN';
export type EnrollmentPlan = 'FREE' | 'MONTHLY' | 'ANNUAL';
export type EnrollmentStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export interface AdminCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  status: 'DRAFT' | 'PUBLISHED';
  enrollmentCount: number;
  avgCompletionRate: number;
  moduleCount: number;
  contentCount: number;
  activeEnrollmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminModule {
  id: string;
  title: string;
  description: string;
  order: number;
  estimatedMinutes: number;
  passingScore: number;
  isActive: boolean;
  _count: { concepts: number; content: number };
}

export interface AdminConcept {
  id: string;
  title: string;
  description: string;
  order: number;
  prerequisites: Array<{ prerequisiteId: string }>;
}

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

export interface ChallengeLaunchPayload {
  title: string;
  hashtag: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  isPinned?: boolean;
}

export interface ChallengeLaunchResult {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  isPinned: boolean;
  tag: { id: string; name: string; slug: string };
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

  createUser: (token: string, payload: { email: string; name: string; password: string; role: UserRole; emailVerified?: boolean }) =>
    authedPost<UserRow>('/admin/users', token, payload),

  updateUser: (token: string, userId: string, payload: { name?: string; role?: UserRole; isActive?: boolean; emailVerified?: boolean }) =>
    authedPatch<UserRow>(`/admin/users/${userId}`, token, payload),

  enrollUser: (token: string, userId: string, payload: { trackId: string; plan?: EnrollmentPlan }) =>
    authedPost<{ trackId: string; trackTitle: string; plan: EnrollmentPlan; status: EnrollmentStatus; startDate: string }>(
      `/admin/users/${userId}/enrollments`,
      token,
      payload,
    ),

  updateEnrollment: (token: string, userId: string, trackId: string, payload: { status?: EnrollmentStatus; plan?: EnrollmentPlan }) =>
    authedPatch<void>(`/admin/users/${userId}/enrollments/${trackId}`, token, payload),

  getCourses: (token: string) =>
    authedFetch<AdminCourse[]>('/admin/courses', token),

  createCourse: (token: string, payload: { title: string; slug: string; description: string; icon?: string; isActive?: boolean }) =>
    authedPost<AdminCourse>('/admin/courses', token, payload),

  updateCourse: (token: string, trackId: string, payload: { title?: string; description?: string; icon?: string; isActive?: boolean }) =>
    authedPatch<AdminCourse>(`/admin/courses/${trackId}`, token, payload),

  getModules: (token: string, trackId: string) =>
    authedFetch<AdminModule[]>(`/admin/courses/${trackId}/modules`, token),

  createModule: (token: string, trackId: string, payload: { title: string; description: string; estimatedMinutes: number; passingScore?: number }) =>
    authedPost<AdminModule>(`/admin/courses/${trackId}/modules`, token, payload),

  updateModule: (token: string, trackId: string, moduleId: string, payload: { title?: string; description?: string; estimatedMinutes?: number; passingScore?: number; order?: number; isActive?: boolean }) =>
    authedPatch<AdminModule>(`/admin/courses/${trackId}/modules/${moduleId}`, token, payload),

  deleteModule: (token: string, trackId: string, moduleId: string) =>
    authedDelete(`/admin/courses/${trackId}/modules/${moduleId}`, token),

  getConcepts: (token: string, trackId: string, moduleId: string) =>
    authedFetch<AdminConcept[]>(`/admin/courses/${trackId}/modules/${moduleId}/concepts`, token),

  createConcept: (token: string, trackId: string, moduleId: string, payload: { title: string; description?: string; prerequisiteIds?: string[] }) =>
    authedPost<AdminConcept>(`/admin/courses/${trackId}/modules/${moduleId}/concepts`, token, payload),

  updateConcept: (token: string, trackId: string, moduleId: string, conceptId: string, payload: { title?: string; description?: string }) =>
    authedPatch<AdminConcept>(`/admin/courses/${trackId}/modules/${moduleId}/concepts/${conceptId}`, token, payload),

  deleteConcept: (token: string, trackId: string, moduleId: string, conceptId: string) =>
    authedDelete(`/admin/courses/${trackId}/modules/${moduleId}/concepts/${conceptId}`, token),

  getTierReviewQueue: (token: string) =>
    authedFetch<TierReviewItem[]>('/admin/creators/tier-review', token),

  decideTier: (token: string, creatorId: string, decision: 'APPROVE' | 'REJECT' | 'REQUEST_MORE', reason?: string) =>
    authedPost<void>(`/admin/creators/${creatorId}/tier-decision`, token, { decision, reason }),

  getGaps: (token: string) =>
    authedFetch<GapRow[]>('/admin/gaps', token),

  getFranchises: (token: string) =>
    authedFetch<FranchiseRow[]>('/admin/franchises', token),

  launchChallenge: (token: string, payload: ChallengeLaunchPayload) =>
    authedPost<ChallengeLaunchResult>('/admin/challenges', token, payload),
};
