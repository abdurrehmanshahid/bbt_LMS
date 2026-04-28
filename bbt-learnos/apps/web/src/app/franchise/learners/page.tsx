'use client';

import React, { useEffect, useState, useCallback } from 'react';

interface Learner {
  id: string; name: string; email: string; joinedAt: string;
  currentTrack: { title: string; icon: string } | null;
  streakDays: number; absorptionStatus: string; absorptionScore: number;
  badgeCount: number;
  activeEnrollments: Array<{ track: string; plan: string }>;
}

interface PageData { rows: Learner[]; total: number; page: number; pages: number }

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const STATUS_COLOR: Record<string, string> = {
  ABSORBED: 'bg-green-500/20 text-green-400',
  ELIGIBLE: 'bg-blue-500/20 text-blue-400',
  UNDER_REVIEW: 'bg-yellow-500/20 text-yellow-400',
  REFERRED: 'bg-purple-500/20 text-purple-400',
  INELIGIBLE: 'bg-slate-700 text-slate-400',
};

export default function FranchiseLearnersPage(): React.JSX.Element {
  const [data, setData] = useState<PageData | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/franchise/learners?page=${p}&limit=20`, { credentials: 'include' });
      if (res.ok) setData(await res.json() as PageData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPage(page); }, [page, loadPage]);

  const assignByEmail = async () => {
    if (!addEmail.trim()) return;
    setAdding(true);
    try {
      // Lookup learner by email via admin users endpoint, then assign
      const userRes = await fetch(`${API}/admin/users?search=${encodeURIComponent(addEmail)}&limit=1`, { credentials: 'include' });
      const userData = await userRes.json() as { rows: Array<{ id: string }> };
      const learnerId = userData.rows[0]?.id;
      if (!learnerId) { alert('Learner not found'); return; }

      const res = await fetch(`${API}/franchise/learners/${learnerId}`, { method: 'POST', credentials: 'include' });
      if (res.ok) { setAddEmail(''); void loadPage(page); }
      else { const b = await res.json() as { message?: string }; alert(b.message ?? 'Error'); }
    } finally {
      setAdding(false);
    }
  };

  const removeLearner = async (learnerId: string) => {
    if (!confirm('Remove this learner from your franchise?')) return;
    const res = await fetch(`${API}/franchise/learners/${learnerId}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) void loadPage(page);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Learners</h1>
          {data && <p className="text-sm text-slate-400 mt-1">{data.total} total enrolled</p>}
        </div>
        <div className="flex gap-2">
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Learner email…"
            className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-[#2E3192] focus:outline-none"
          />
          <button
            onClick={() => void assignByEmail()}
            disabled={adding || !addEmail.trim()}
            className="rounded-lg bg-[#2E3192] px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {adding ? '…' : 'Add'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400">Loading…</div>
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center text-slate-500">
          No learners assigned yet — add them by email above
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900">
                  {['Learner', 'Track', 'Badges', 'Streak', 'Status', 'Score', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.rows.map((l) => (
                  <tr key={l.id} className="bg-slate-900 hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{l.name}</p>
                      <p className="text-xs text-slate-500">{l.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {l.currentTrack
                        ? <span>{l.currentTrack.icon} {l.currentTrack.title}</span>
                        : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#F7941D]">{l.badgeCount}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {l.streakDays > 0 ? `🔥 ${l.streakDays}d` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[l.absorptionStatus] ?? STATUS_COLOR['INELIGIBLE']}`}>
                        {l.absorptionStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{l.absorptionScore}%</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void removeLearner(l.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>Page {data.page} of {data.pages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 hover:border-slate-500 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                  disabled={page === data.pages}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 hover:border-slate-500 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
