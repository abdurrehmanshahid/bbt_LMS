import { authedFetch, authedPost } from './api';

export interface FeedItem {
  id: string;
  title: string;
  type: string;
  track: string;
  thumbnailUrl: string | null;
  durationSeconds: number;
  watched: boolean;
  saved: boolean;
  completionRate: number;
  creatorName: string;
}

export interface Module {
  id: string;
  title: string;
  order: number;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED' | 'ASSESSMENT_PENDING';
  durationMinutes: number;
  conceptCount: number;
}

export interface TrackDetail {
  id: string;
  title: string;
  modules: Module[];
  completedModules: number;
  totalModules: number;
}

export interface ModuleDetail {
  id: string;
  title: string;
  description: string;
  trackTitle: string;
  videoUrl: string | null;
  signedToken: string | null;
  resources: Array<{ title: string; url: string; type: string }>;
  assessmentUnlocked: boolean;
  completed: boolean;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  category: string;
}

export interface CohortMember {
  id: string;
  name: string;
  avatarUrl: string | null;
  completedModules: number;
  streak: number;
  lastActive: string;
}

export interface CohortData {
  id: string;
  name: string;
  track: string;
  members: CohortMember[];
  weeklyActivity: Array<{ date: string; events: number }>;
}

export interface BadgeSummary {
  id: string;
  trackTitle: string;
  moduleTitle: string;
  issuedAt: string;
  verifyUrl: string;
}

export const learnerApi = {
  getFeed: (token: string, cursor?: string) =>
    authedFetch<{ items: FeedItem[]; nextCursor: string | null }>(
      '/learner/feed',
      token,
      cursor ? { cursor } : undefined,
    ),

  getTrack: (token: string, trackId: string) =>
    authedFetch<TrackDetail>(`/learner/track/${trackId}/modules`, token),

  getModule: (token: string, moduleId: string) =>
    authedFetch<ModuleDetail>(`/learner/modules/${moduleId}`, token),

  trackEvent: (token: string, payload: Record<string, unknown>) =>
    authedPost<void>('/analytics/event', token, payload),

  getNotifications: (token: string) =>
    authedFetch<Notification[]>('/learner/notifications', token),

  markRead: (token: string, id: string) =>
    authedPost<void>(`/learner/notifications/${id}/read`, token),

  getCohort: (token: string) =>
    authedFetch<CohortData>('/learner/cohort', token),

  getPortfolio: (token: string) =>
    authedFetch<{ badges: BadgeSummary[]; absorptionReady: boolean }>('/learner/portfolio', token),
};
