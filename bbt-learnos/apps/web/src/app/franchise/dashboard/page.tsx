'use client';

import React, { useEffect, useState } from 'react';

interface DashboardData {
  franchise: {
    name: string; city: string;
    psdaStatus: string; navttcStatus: string;
    revenueSharePercent: number; setupFeePaid: boolean;
  };
  stats: {
    totalLearners: number; activeLearners: number;
    totalBadges: number; learnersWithBadges: number;
    completionRate: number; estimatedRevenueMonthPKR: number;
    paidEnrollments: number; revenueSharePercent: number;
  };
  learnersPerTrack: Array<{ trackId: string; count: number }>;
  badgeLeaderboard: Array<{ learnerId: string; badges: number }>;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: 'text-green-400', PENDING: 'text-yellow-400', SUSPENDED: 'text-red-400',
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

export default function FranchiseDashboardPage(): React.JSX.Element {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/franchise/dashboard`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) { setError('Access denied or franchise not found'); return null; }
        return r.json() as Promise<DashboardData>;
      })
      .then((d) => { if (d) setData(d); })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#F7941D] border-t-transparent" />
    </div>
  );

  if (error) return (
    <div className="rounded-xl bg-red-500/10 p-6 text-red-400">{error}</div>
  );

  if (!data) return <div />;

  const { franchise: f, stats: s } = data;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{f.name}</h1>
        <p className="text-slate-400 mt-1">📍 {f.city} · {s.revenueSharePercent}% revenue share</p>
        <div className="mt-2 flex gap-4 text-sm">
          <span>PSDA: <span className={STATUS_COLOR[f.psdaStatus] ?? 'text-slate-400'}>{f.psdaStatus}</span></span>
          <span>NAVTTC: <span className={STATUS_COLOR[f.navttcStatus] ?? 'text-slate-400'}>{f.navttcStatus}</span></span>
          {!f.setupFeePaid && <span className="text-yellow-400">⚠ Setup fee pending</span>}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Learners" value={s.totalLearners} />
        <StatCard label="Active Enrollments" value={s.activeLearners} />
        <StatCard label="Badges Earned" value={s.totalBadges} sub={`by ${s.learnersWithBadges} learners`} />
        <StatCard label="Completion Rate" value={`${s.completionRate}%`} />
      </div>

      {/* Revenue */}
      <div className="rounded-xl border border-[#F7941D]/30 bg-[#F7941D]/5 p-6">
        <p className="text-xs uppercase tracking-widest text-[#F7941D]">Estimated Revenue This Month</p>
        <p className="mt-2 text-4xl font-bold text-white">PKR {s.estimatedRevenueMonthPKR.toLocaleString()}</p>
        <p className="mt-1 text-sm text-slate-400">
          Based on {s.paidEnrollments} paid enrollments × PKR 2,999 × {f.revenueSharePercent}% share
        </p>
        <p className="mt-3 text-xs text-slate-500">
          This is an estimate. Final payouts are calculated at end of month by BBT Finance.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <a
          href="/franchise/learners"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-[#2E3192] hover:text-white"
        >
          View All Learners →
        </a>
        <a
          href="/franchise/compliance"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-green-500 hover:text-white"
        >
          Compliance Checklist →
        </a>
      </div>

      {/* Badge leaderboard */}
      {data.badgeLeaderboard.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-3">Top Badge Earners</h2>
          <div className="space-y-2">
            {data.badgeLeaderboard.slice(0, 5).map((entry, i) => (
              <div key={entry.learnerId} className="flex items-center gap-4 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
                <span className="text-slate-500 w-5 text-sm">#{i + 1}</span>
                <div className="h-8 w-8 rounded-full bg-[#2E3192] flex items-center justify-center text-xs font-bold text-white">
                  {entry.learnerId.slice(0, 2).toUpperCase()}
                </div>
                <span className="flex-1 text-sm text-slate-300 font-mono">{entry.learnerId.slice(0, 8)}…</span>
                <span className="text-[#F7941D] font-bold">{entry.badges} badges</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
