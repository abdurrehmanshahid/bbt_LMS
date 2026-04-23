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

// ─── API functions ────────────────────────────────────────────────────────────

export function getTracks(): Promise<TrackSummary[]> {
  return apiFetchRaw<TrackSummary[]>('/tracks', { next: { revalidate: 3600 } });
}

export function getTrack(slug: string): Promise<TrackDetail> {
  return apiFetchRaw<TrackDetail>(`/tracks/${slug}`, { next: { revalidate: 3600 } });
}
