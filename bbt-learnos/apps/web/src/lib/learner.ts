const API = normalizeApiBase(process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api');

function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json() as { message?: unknown; error?: string; code?: string };
    const raw = data.message ?? data.error ?? data.code;
    return typeof raw === 'string' ? raw : JSON.stringify(raw);
  } catch {
    return res.statusText || 'Request failed';
  }
}

async function authedFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await readErrorMessage(res)}`);
  return res.json() as Promise<T>;
}

async function authedPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await readErrorMessage(res)}`);
  return res.json() as Promise<T>;
}

export interface DashboardData {
  streak: number;
  notificationCount: number;
  trackProgress: {
    trackId: string;
    trackTitle: string;
    trackIcon: string;
    currentModuleId: string;
    currentModuleTitle: string;
    completionPercent: number;
    nextStep: string;
  } | null;
  cohort: {
    id: string;
    name: string;
    memberCount: number;
    recentActivity: Array<{ memberName: string; action: string; at: string }>;
  } | null;
  upcomingSessions: Array<{
    id: string;
    title: string;
    startsAt: string;
    trackTitle: string;
  }>;
}

export interface FeedItem {
  id: string;
  type: 'REEL' | 'LECTURE' | 'LIVE_RECORDING' | 'RESOURCE';
  title: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
  creator: { name: string; avatarUrl: string | null };
  track: { title: string; slug: string };
  bucket: 'PROGRESSION' | 'REINFORCEMENT' | 'ADJACENT' | 'SOCIAL';
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: string | null;
}

export interface EnrolledModule {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'ASSESSMENT_PENDING';
  prerequisiteTitle: string | null;
}

export interface EnrolledTrack {
  id: string;
  title: string;
  icon: string;
  description: string;
  modules: EnrolledModule[];
  completionPercent: number;
}

export interface ModuleDetail {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'ASSESSMENT_PENDING';
  concepts: Array<{ id: string; title: string; description: string }>;
  resources: Array<{ id: string; name: string; url: string; type: string }>;
  hasAssessment: boolean;
  passingScore: number;
  questionCount: number;
  content: Array<{
    id: string;
    title: string;
    muxPlaybackId: string | null;
    duration: number | null;
    type: string;
    watched: boolean;
    watchedPercent: number;
  }>;
}

export interface PlaybackData {
  playbackId: string;
  signedToken: string | null;
}

export interface EnrollmentRecord {
  trackId: string;
  plan: string;
  status: string;
  track: {
    id: string;
    slug: string;
    title: string;
    icon: string;
    trackNumber: number;
  };
}

export interface SocialFeedItem {
  id: string;
  type: string;
  title: string;
  description: string;
  muxPlaybackId: string | null;
  youtubeId: string | null;
  thumbnailUrl: string | null;
  duration: number | null;
  tags: string[];
  viewCount: number;
  track: { title: string; slug: string; icon: string };
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creatorProfile: { displayName: string; tier: number; isVerified: boolean } | null;
  };
}

export interface SocialFeedPage {
  items: SocialFeedItem[];
  nextCursor: string | null;
}

export interface EnrollFreeResult {
  enrollmentId: string;
}

export const learnerApi = {
  getDashboard: (token: string) => authedFetch<DashboardData>('/learner/dashboard', token),

  enrollFree: (token: string, trackId: string) =>
    authedPost<EnrollFreeResult>('/learner/enroll/free', token, { trackId }),

  getEnrollments: (token: string) =>
    authedFetch<EnrollmentRecord[]>('/learner/enrollments', token),

  getFeed: (token: string, cursor?: string) =>
    authedFetch<FeedPage>(`/learner/feed${cursor ? `?cursor=${cursor}` : ''}`, token),

  getSocialFeed: (token: string, cursor?: string) =>
    authedFetch<SocialFeedPage>(`/social/feed${cursor ? `?cursor=${cursor}` : ''}`, token),

  getEnrolledTrack: (token: string, trackId: string) =>
    authedFetch<EnrolledTrack>(`/learner/track/${trackId}/modules`, token),

  getModule: (token: string, trackId: string, moduleId: string) =>
    authedFetch<ModuleDetail>(`/learner/track/${trackId}/module/${moduleId}`, token),

  getPlaybackUrl: (token: string, contentId: string) =>
    authedFetch<PlaybackData>(`/content/${contentId}/playback-url`, token),

  trackEvent: (token: string, contentId: string, event: string, payload?: Record<string, unknown>) =>
    authedPost<void>('/analytics/event', token, { contentId, event, ...payload }),
};
