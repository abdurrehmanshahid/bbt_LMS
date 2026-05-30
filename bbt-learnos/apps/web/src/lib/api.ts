const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

async function apiFetchRaw<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API ${path} → ${res.status}: ${error}`);
  }
  return res.json() as Promise<T>;
}

export function apiFetch<T = unknown>(path: string, token?: string): Promise<T> {
  return apiFetchRaw<T>(path, {
    credentials: 'include',
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
}

export function apiPost<T = unknown>(path: string, body: unknown, token?: string): Promise<T> {
  return apiFetchRaw<T>(path, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(body),
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
}

// ─── Track types ─────────────────────────────────────────────────────────────

export interface TrackSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  trackNumber: number;
  enrollmentCount: number;
  avgCompletionRate: number;
  _count: { modules: number };
}

export interface ModuleSummary {
  id: string;
  order: number;
  title: string;
  description: string;
  estimatedMinutes: number;
  passingScore: number;
  _count: { concepts: number; content: number };
}

export interface TrackDetail extends TrackSummary {
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  modules: ModuleSummary[];
}

export interface ShortFeedItem {
  id: string;
  type: 'REEL';
  title: string;
  description: string;
  muxPlaybackId: string | null;
  youtubeId: string | null;
  duration: number | null;
  thumbnailUrl: string | null;
  tags: string[];
  viewCount: number;
  saveCount: number;
  shareCount: number;
  createdAt: string;
  track: { title: string; slug: string; icon: string };
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creatorProfile: { displayName: string; tier: number; isVerified: boolean } | null;
  };
}

export interface ShortFeedPage {
  items: ShortFeedItem[];
  nextCursor: string | null;
  pinnedChallenge?: PinnedChallenge | null;
}

export interface PinnedChallenge {
  id: string;
  title: string;
  description: string;
  tag: { name: string; slug: string };
  startsAt: string;
  endsAt: string | null;
}

export interface TrendingTag {
  id: string;
  name: string;
  slug: string;
  count: number;
  isChallenge: boolean;
}

export interface TrendingPage {
  tags: TrendingTag[];
  pinnedChallenge: PinnedChallenge | null;
}

export interface TaggedShortFeedPage extends ShortFeedPage {
  tag: { name: string; slug: string };
}

export interface HashtagSuggestions {
  tags: string[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export function getTracks(): Promise<TrackSummary[]> {
  return apiFetchRaw<TrackSummary[]>('/tracks', { next: { revalidate: 3600 } });
}

export function getTrack(slug: string): Promise<TrackDetail> {
  return apiFetchRaw<TrackDetail>(`/tracks/${slug}`, { next: { revalidate: 3600 } });
}

export function getShortsFeed(cursor?: string): Promise<ShortFeedPage> {
  return apiFetchRaw<ShortFeedPage>(`/feed/shorts${cursor ? `?cursor=${cursor}` : ''}`, {
    next: { revalidate: 60 },
  });
}

export function getTrending(): Promise<TrendingPage> {
  return apiFetchRaw<TrendingPage>('/trending', { next: { revalidate: 300 } });
}

export function getTaggedShorts(slug: string, cursor?: string): Promise<TaggedShortFeedPage> {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return apiFetchRaw<TaggedShortFeedPage>(`/tags/${encodeURIComponent(slug)}${params}`, {
    next: { revalidate: 120 },
  });
}

export function getHashtagSuggestions(trackId: string, token: string): Promise<HashtagSuggestions> {
  return apiFetch<HashtagSuggestions>(`/creator/hashtag-suggestions?trackId=${encodeURIComponent(trackId)}`, token);
}

export function trackReelEvent(contentId: string, event: 'reel_view' | 'reel_complete' | 'reel_share'): Promise<void> {
  return apiPost<void>('/analytics/reel-event', { contentId, event });
}

export interface TrackModuleOption {
  id: string;
  title: string;
  order: number;
  estimatedMinutes: number;
}

export interface TrackConceptOption {
  id: string;
  title: string;
  order: number;
}

export function getTrackModules(trackId: string): Promise<TrackModuleOption[]> {
  return apiFetchRaw<TrackModuleOption[]>(`/tracks-by-id/${trackId}/modules`);
}

export function getModuleConcepts(trackId: string, moduleId: string): Promise<TrackConceptOption[]> {
  return apiFetchRaw<TrackConceptOption[]>(`/tracks-by-id/${trackId}/modules/${moduleId}/concepts`);
}
