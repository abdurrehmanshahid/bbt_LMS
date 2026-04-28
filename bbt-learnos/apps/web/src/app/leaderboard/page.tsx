import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Leaderboard',
  description: 'Top learners ranked by skills earned on BBT LearnOS',
};

interface LeaderboardEntry {
  rank: number;
  learnerId: string;
  name: string;
  avatarUrl: string | null;
  badgesEarned: number;
  streakDays: number;
  absorptionStatus: string;
}

interface Track { id: string; slug: string; title: string; icon: string }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getLeaderboard(trackId?: string, period = 'month'): Promise<LeaderboardEntry[]> {
  const params = new URLSearchParams({ period });
  if (trackId) params.set('trackId', trackId);
  const res = await fetch(`${API}/leaderboard?${params.toString()}`, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  return res.json() as Promise<LeaderboardEntry[]>;
}

async function getTracks(): Promise<Track[]> {
  try {
    const res = await fetch(`${API}/tracks`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json() as Promise<Track[]>;
  } catch { return []; }
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
const STATUS_COLOR: Record<string, string> = {
  ABSORBED: 'bg-green-500/20 text-green-400',
  ELIGIBLE: 'bg-blue-500/20 text-blue-400',
  UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  REFERRED: 'bg-purple-500/20 text-purple-400',
  INELIGIBLE: 'bg-slate-700 text-slate-400',
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: { trackId?: string; period?: string };
}): Promise<React.JSX.Element> {
  const period = (searchParams.period ?? 'month') as 'week' | 'month' | 'all';
  const [entries, tracks] = await Promise.all([
    getLeaderboard(searchParams.trackId, period),
    getTracks(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white">🏆 Leaderboard</h1>
        <p className="mt-2 text-slate-400">Ranked by skill badges earned</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1">
          {(['week', 'month', 'all'] as const).map((p) => (
            <a
              key={p}
              href={`/leaderboard?period=${p}${searchParams.trackId ? `&trackId=${searchParams.trackId}` : ''}`}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
                period === p ? 'bg-[#2E3192] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'All Time'}
            </a>
          ))}
        </div>
        <select
          defaultValue={searchParams.trackId ?? ''}
          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 focus:border-[#2E3192] focus:outline-none"
          // onChange handled by form submission — this is a static SSR page
        >
          <option value="">All Tracks</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.icon} {t.title}
            </option>
          ))}
        </select>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center text-slate-500">
          No data yet for this period
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.learnerId}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                entry.rank <= 3
                  ? 'border-[#F7941D]/30 bg-[#F7941D]/5'
                  : 'border-slate-700 bg-slate-900'
              }`}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                {MEDAL[entry.rank] ? (
                  <span className="text-xl">{MEDAL[entry.rank]}</span>
                ) : (
                  <span className="text-sm font-bold text-slate-500">#{entry.rank}</span>
                )}
              </div>

              {/* Avatar */}
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#2E3192] flex items-center justify-center font-bold text-white">
                {entry.name[0]?.toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{entry.name}</p>
                <div className="mt-0.5 flex items-center gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[entry.absorptionStatus] ?? STATUS_COLOR['INELIGIBLE']}`}>
                    {entry.absorptionStatus.replace('_', ' ')}
                  </span>
                  {entry.streakDays > 0 && (
                    <span className="text-xs text-slate-400">🔥 {entry.streakDays}d streak</span>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-[#F7941D]">{entry.badgesEarned}</p>
                <p className="text-xs text-slate-500">badges</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
