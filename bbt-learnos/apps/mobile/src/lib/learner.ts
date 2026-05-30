import { authedFetch, authedPost, publicFetch } from './api';

export interface FeedItem {
  id: string;
  title: string;
  type: string;
  track: string;
  thumbnailUrl: string | null;
  muxPlaybackId?: string | null;
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

export interface TrendingTag {
  id: string;
  name: string;
  slug: string;
  count: number;
  isChallenge: boolean;
}

export interface PinnedChallenge {
  id: string;
  title: string;
  description: string;
  tag: { name: string; slug: string };
  startsAt: string;
  endsAt: string | null;
}

export interface TrendingData {
  tags: TrendingTag[];
  pinnedChallenge: PinnedChallenge | null;
}

interface MockModuleDef {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  conceptCount: number;
  creatorName: string;
  status: Module['status'];
  completionRate: number;
  watched: boolean;
  saved: boolean;
  assessmentUnlocked: boolean;
  completed: boolean;
  description: string;
  resources: Array<{ title: string; url: string; type: string }>;
}

interface MockTrackDef {
  id: string;
  title: string;
  shortLabel: string;
  modules: MockModuleDef[];
}

interface PublicShortItem {
  id: string;
  title: string;
  type: 'REEL';
  track: { title: string; slug: string };
  thumbnailUrl: string | null;
  muxPlaybackId: string | null;
  duration: number | null;
  creator: {
    name: string;
    creatorProfile: { displayName: string } | null;
  };
}

interface PublicShortPage {
  items: PublicShortItem[];
  nextCursor: string | null;
}

const DEV_LEARNER_TOKEN = 'dev-openmeup-token';
const VERIFY_BASE_URL = 'https://talent.bigbinarytech.com/verify';

const MOCK_TRACKS: MockTrackDef[] = [
  {
    id: 'track-mern-pakistan',
    title: 'MERN Stack Career Accelerator',
    shortLabel: 'MERN Stack',
    modules: [
      {
        id: 'module-js-foundations',
        title: 'JavaScript Foundations for Product Engineers',
        type: 'lesson',
        durationMinutes: 18,
        conceptCount: 7,
        creatorName: 'Hira Khan',
        status: 'COMPLETED',
        completionRate: 1,
        watched: true,
        saved: true,
        assessmentUnlocked: true,
        completed: true,
        description:
          'Build a clear mental model for scope, closures, async flow, and array methods. This module is positioned as the first pass before React, so the examples stay practical and product-focused.',
        resources: [
          { title: 'Async JavaScript drill sheet', url: 'https://example.com/js-drills', type: 'pdf' },
          { title: 'Closures sandbox repo', url: 'https://example.com/js-closures', type: 'repo' },
        ],
      },
      {
        id: 'module-react-state',
        title: 'React State, Effects, and Query Boundaries',
        type: 'lesson',
        durationMinutes: 24,
        conceptCount: 9,
        creatorName: 'Fatima Ali',
        status: 'ASSESSMENT_PENDING',
        completionRate: 0.92,
        watched: true,
        saved: false,
        assessmentUnlocked: true,
        completed: false,
        description:
          'Work through local state, derived state, server state, and mutation flow with React Query. The examples mirror a learner dashboard so the patterns stay close to the app you are exploring.',
        resources: [
          { title: 'State ownership cheatsheet', url: 'https://example.com/react-state', type: 'pdf' },
          { title: 'React Query notes', url: 'https://example.com/react-query', type: 'link' },
        ],
      },
      {
        id: 'module-node-apis',
        title: 'Node APIs, Validation, and Error Contracts',
        type: 'lesson',
        durationMinutes: 31,
        conceptCount: 8,
        creatorName: 'Usman Tariq',
        status: 'AVAILABLE',
        completionRate: 0.3,
        watched: false,
        saved: true,
        assessmentUnlocked: false,
        completed: false,
        description:
          'This module walks through request validation, structured error payloads, and clean service boundaries in a Nest-style backend. It ties directly into how LearnOS exposes learner and creator flows.',
        resources: [
          { title: 'Validation pattern examples', url: 'https://example.com/node-validation', type: 'repo' },
        ],
      },
      {
        id: 'module-prisma-data',
        title: 'Prisma Modeling for Learning Products',
        type: 'workshop',
        durationMinutes: 27,
        conceptCount: 6,
        creatorName: 'Samiya Noor',
        status: 'LOCKED',
        completionRate: 0,
        watched: false,
        saved: false,
        assessmentUnlocked: false,
        completed: false,
        description:
          'Design tracks, modules, progress, and badges with transaction-safe writes. The workshop uses the learner journey as the main modeling anchor.',
        resources: [
          { title: 'Schema review notes', url: 'https://example.com/prisma-schema', type: 'pdf' },
        ],
      },
    ],
  },
  {
    id: 'track-ai-product',
    title: 'AI Product Engineering',
    shortLabel: 'AI Product',
    modules: [
      {
        id: 'module-prompt-systems',
        title: 'Prompt Systems for Production Workflows',
        type: 'masterclass',
        durationMinutes: 16,
        conceptCount: 5,
        creatorName: 'Ayesha Qureshi',
        status: 'AVAILABLE',
        completionRate: 0.55,
        watched: false,
        saved: true,
        assessmentUnlocked: false,
        completed: false,
        description:
          'A compact pass over prompt framing, tool use boundaries, and evaluation loops for assistants embedded in product workflows.',
        resources: [
          { title: 'Prompt review rubric', url: 'https://example.com/prompt-rubric', type: 'pdf' },
        ],
      },
      {
        id: 'module-ranking-loop',
        title: 'Recommendation Loops and Feedback Signals',
        type: 'lesson',
        durationMinutes: 22,
        conceptCount: 7,
        creatorName: 'Bilal Ahmed',
        status: 'LOCKED',
        completionRate: 0,
        watched: false,
        saved: false,
        assessmentUnlocked: false,
        completed: false,
        description:
          'Covers progression-first ranking, reinforcement content, and adjacent recommendations tuned for learning outcomes rather than raw engagement.',
        resources: [
          { title: 'Ranking objective summary', url: 'https://example.com/ranking-objective', type: 'link' },
        ],
      },
    ],
  },
];

const MOCK_COHORT: CohortData = {
  id: 'cohort-pk-spring-07',
  name: 'Spring 2026 Cohort 07',
  track: 'MERN Stack Career Accelerator',
  members: [
    { id: 'cohort-1', name: 'Abdur Rehman', avatarUrl: null, completedModules: 3, streak: 8, lastActive: '2026-04-24T07:30:00.000Z' },
    { id: 'cohort-2', name: 'Maham Riaz', avatarUrl: null, completedModules: 4, streak: 11, lastActive: '2026-04-24T06:00:00.000Z' },
    { id: 'cohort-3', name: 'Hassan Javed', avatarUrl: null, completedModules: 3, streak: 6, lastActive: '2026-04-23T18:30:00.000Z' },
    { id: 'cohort-4', name: 'Iqra Zahid', avatarUrl: null, completedModules: 2, streak: 5, lastActive: '2026-04-23T20:15:00.000Z' },
    { id: 'cohort-5', name: 'Saad Tariq', avatarUrl: null, completedModules: 2, streak: 4, lastActive: '2026-04-23T21:00:00.000Z' },
  ],
  weeklyActivity: [
    { date: '2026-04-20T00:00:00.000Z', events: 12 },
    { date: '2026-04-21T00:00:00.000Z', events: 18 },
    { date: '2026-04-22T00:00:00.000Z', events: 9 },
    { date: '2026-04-23T00:00:00.000Z', events: 21 },
    { date: '2026-04-24T00:00:00.000Z', events: 15 },
    { date: '2026-04-25T00:00:00.000Z', events: 11 },
    { date: '2026-04-26T00:00:00.000Z', events: 7 },
  ],
};

let mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Assessment unlocked',
    body: 'React State, Effects, and Query Boundaries is ready for assessment. Clear it to earn your next badge.',
    read: false,
    createdAt: '2026-04-24T05:30:00.000Z',
    category: 'BADGE',
  },
  {
    id: 'notif-2',
    title: 'Cohort leaderboard update',
    body: 'You moved into the top 3 this week. One more completed module puts you on top.',
    read: false,
    createdAt: '2026-04-23T16:20:00.000Z',
    category: 'COHORT',
  },
  {
    id: 'notif-3',
    title: '8-day streak',
    body: 'You have studied every day this week. Keep the streak alive tomorrow to strengthen your progression score.',
    read: true,
    createdAt: '2026-04-22T09:00:00.000Z',
    category: 'STREAK',
  },
];

function isDevLearnerToken(token: string): boolean {
  return token === DEV_LEARNER_TOKEN;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function allModules(): Array<MockModuleDef & { trackId: string; trackTitle: string; shortLabel: string }> {
  return MOCK_TRACKS.flatMap((track) =>
    track.modules.map((module) => ({
      ...module,
      trackId: track.id,
      trackTitle: track.title,
      shortLabel: track.shortLabel,
    })),
  );
}

function buildFeed(): { items: FeedItem[]; nextCursor: string | null } {
  const items = allModules().map((module) => ({
    id: module.id,
    title: module.title,
    type: module.type,
    track: module.shortLabel,
    thumbnailUrl: null,
    muxPlaybackId: null,
    durationSeconds: module.durationMinutes * 60,
    watched: module.watched,
    saved: module.saved,
    completionRate: module.completionRate,
    creatorName: module.creatorName,
  }));

  return { items, nextCursor: null };
}

function buildTrack(trackId: string): TrackDetail {
  const track = MOCK_TRACKS.find((item) => item.id === trackId) ?? MOCK_TRACKS[0];
  const modules = track.modules.map<Module>((module, index) => ({
    id: module.id,
    title: module.title,
    order: index + 1,
    status: module.status,
    durationMinutes: module.durationMinutes,
    conceptCount: module.conceptCount,
  }));

  return {
    id: track.id,
    title: track.title,
    modules,
    completedModules: modules.filter((module) => module.status === 'COMPLETED').length,
    totalModules: modules.length,
  };
}

function buildModule(moduleId: string): ModuleDetail {
  const module = allModules().find((item) => item.id === moduleId) ?? allModules()[0];
  return {
    id: module.id,
    title: module.title,
    description: module.description,
    trackTitle: module.trackTitle,
    videoUrl: null,
    signedToken: null,
    resources: clone(module.resources),
    assessmentUnlocked: module.assessmentUnlocked,
    completed: module.completed,
  };
}

function buildPortfolio(): { badges: BadgeSummary[]; absorptionReady: boolean } {
  const badges: BadgeSummary[] = [
    {
      id: 'badge-js-foundations',
      trackTitle: 'MERN Stack Career Accelerator',
      moduleTitle: 'JavaScript Foundations for Product Engineers',
      issuedAt: '2026-04-21T11:00:00.000Z',
      verifyUrl: `${VERIFY_BASE_URL}/badge-js-foundations`,
    },
    {
      id: 'badge-react-state',
      trackTitle: 'MERN Stack Career Accelerator',
      moduleTitle: 'React State, Effects, and Query Boundaries',
      issuedAt: '2026-04-24T06:45:00.000Z',
      verifyUrl: `${VERIFY_BASE_URL}/badge-react-state`,
    },
  ];

  return {
    badges,
    absorptionReady: true,
  };
}

function devGetFeed(token: string, cursor?: string): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  void token;
  void cursor;
  return Promise.resolve(clone(buildFeed()));
}

async function getPublicShorts(cursor?: string): Promise<{ items: FeedItem[]; nextCursor: string | null }> {
  const page = await publicFetch<PublicShortPage>('/feed/shorts', cursor ? { cursor } : undefined);
  return {
    nextCursor: page.nextCursor,
    items: page.items.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      track: item.track.title,
      thumbnailUrl: item.thumbnailUrl,
      muxPlaybackId: item.muxPlaybackId,
      durationSeconds: item.duration ?? 60,
      watched: false,
      saved: false,
      completionRate: 0,
      creatorName: item.creator.creatorProfile?.displayName ?? item.creator.name,
    })),
  };
}

function devGetTrack(token: string, trackId: string): Promise<TrackDetail> {
  void token;
  return Promise.resolve(clone(buildTrack(trackId)));
}

function devGetModule(token: string, moduleId: string): Promise<ModuleDetail> {
  void token;
  return Promise.resolve(clone(buildModule(moduleId)));
}

function devTrackEvent(token: string, payload: Record<string, unknown>): Promise<void> {
  void token;
  void payload;
  return Promise.resolve();
}

function devGetNotifications(token: string): Promise<Notification[]> {
  void token;
  return Promise.resolve(clone(mockNotifications));
}

function devMarkRead(token: string, id: string): Promise<void> {
  void token;
  mockNotifications = mockNotifications.map((notification) =>
    notification.id === id ? { ...notification, read: true } : notification,
  );
  return Promise.resolve();
}

function devGetCohort(token: string): Promise<CohortData> {
  void token;
  return Promise.resolve(clone(MOCK_COHORT));
}

function devGetPortfolio(token: string): Promise<{ badges: BadgeSummary[]; absorptionReady: boolean }> {
  void token;
  return Promise.resolve(clone(buildPortfolio()));
}

function devGetTrending(): Promise<TrendingData> {
  return Promise.resolve({
    pinnedChallenge: {
      id: 'challenge-ai-helper',
      title: 'Build an AI helper in 60 seconds',
      description: 'Post one short reel showing a practical helper, prompt, or workflow.',
      tag: { name: 'AIHelperChallenge', slug: 'aihelperchallenge' },
      startsAt: '2026-05-27T00:00:00.000Z',
      endsAt: null,
    },
    tags: [
      { id: 'tag-genai', name: 'GenAI', slug: 'genai', count: 42, isChallenge: false },
      { id: 'tag-react', name: 'React', slug: 'react', count: 31, isChallenge: false },
      { id: 'tag-ai-helper', name: 'AIHelperChallenge', slug: 'aihelperchallenge', count: 27, isChallenge: true },
      { id: 'tag-career', name: 'CareerOS', slug: 'careeros', count: 18, isChallenge: false },
    ],
  });
}

export const learnerApi = {
  getFeed: (token: string, cursor?: string) =>
    isDevLearnerToken(token)
      ? devGetFeed(token, cursor)
      : getPublicShorts(cursor),

  getTrack: (token: string, trackId: string) =>
    isDevLearnerToken(token)
      ? devGetTrack(token, trackId)
      : authedFetch<TrackDetail>(`/learner/track/${trackId}/modules`, token),

  getModule: (token: string, moduleId: string) =>
    isDevLearnerToken(token)
      ? devGetModule(token, moduleId)
      : authedFetch<ModuleDetail>(`/learner/modules/${moduleId}`, token),

  trackEvent: (token: string, payload: Record<string, unknown>) =>
    isDevLearnerToken(token)
      ? devTrackEvent(token, payload)
      : authedPost<void>('/analytics/event', token, payload),

  getNotifications: (token: string) =>
    isDevLearnerToken(token)
      ? devGetNotifications(token)
      : authedFetch<Notification[]>('/learner/notifications', token),

  markRead: (token: string, id: string) =>
    isDevLearnerToken(token)
      ? devMarkRead(token, id)
      : authedPost<void>(`/learner/notifications/${id}/read`, token),

  getCohort: (token: string) =>
    isDevLearnerToken(token)
      ? devGetCohort(token)
      : authedFetch<CohortData>('/learner/cohort', token),

  getPortfolio: (token: string) =>
    isDevLearnerToken(token)
      ? devGetPortfolio(token)
      : authedFetch<{ badges: BadgeSummary[]; absorptionReady: boolean }>('/learner/portfolio', token),

  getTrending: (token: string) =>
    isDevLearnerToken(token)
      ? devGetTrending()
      : publicFetch<TrendingData>('/trending'),
};
