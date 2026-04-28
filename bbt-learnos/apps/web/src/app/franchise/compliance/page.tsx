'use client';

import React, { useEffect, useState } from 'react';

interface ChecklistItem { id: string; label: string; done: boolean; doneAt?: string }
interface ComplianceData {
  psdaStatus: string; navttcStatus: string; complianceCheckedAt: string | null;
  progress: number; overallStatus: 'green' | 'yellow' | 'red';
  checklist: ChecklistItem[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const STATUS_COLOR = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' };
const STATUS_ICON  = { green: '✅', yellow: '⚠️', red: '🚫' };
const AFFIL_COLOR: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  PENDING: 'bg-yellow-500/20 text-yellow-400',
  SUSPENDED: 'bg-red-500/20 text-red-400',
};

export default function FranchiseCompliancePage(): React.JSX.Element {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`${API}/franchise/compliance`, { credentials: 'include' });
      if (res.ok) setData(await res.json() as ComplianceData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const toggle = async (itemId: string) => {
    setToggling(itemId);
    try {
      const res = await fetch(`${API}/franchise/compliance/${itemId}/toggle`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const { done, doneAt } = await res.json() as { done: boolean; doneAt?: string };
        setData((prev) => prev ? {
          ...prev,
          checklist: prev.checklist.map((i) =>
            i.id === itemId ? { ...i, done, ...(doneAt ? { doneAt } : {}) } : i
          ),
          progress: Math.round((prev.checklist.filter((i) => i.id === itemId ? done : i.done).length / prev.checklist.length) * 100),
        } : null);
      }
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <div className="py-16 text-center text-slate-400">Loading…</div>;
  if (!data) return <div className="rounded-xl bg-red-500/10 p-6 text-red-400">Failed to load compliance data</div>;

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Compliance</h1>
        <p className="text-sm text-slate-400 mt-1">
          Keep your franchise compliant to maintain PSDA/NAVTTC affiliation
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Overall</p>
          <p className={`mt-2 text-2xl ${STATUS_COLOR[data.overallStatus]}`}>{STATUS_ICON[data.overallStatus]}</p>
          <p className={`mt-1 text-xs font-medium ${STATUS_COLOR[data.overallStatus]}`}>
            {data.overallStatus === 'green' ? 'Compliant' : data.overallStatus === 'yellow' ? 'In Progress' : 'Action Needed'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">PSDA</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${AFFIL_COLOR[data.psdaStatus] ?? ''}`}>
            {data.psdaStatus}
          </span>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-center">
          <p className="text-xs text-slate-500 uppercase tracking-wider">NAVTTC</p>
          <span className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${AFFIL_COLOR[data.navttcStatus] ?? ''}`}>
            {data.navttcStatus}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-white">Checklist Progress</p>
          <p className="text-sm text-[#F7941D] font-semibold">{data.progress}%</p>
        </div>
        <div className="h-2 rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-[#F7941D] transition-all duration-500"
            style={{ width: `${data.progress}%` }}
          />
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {data.checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
              item.done ? 'border-green-500/30 bg-green-500/5' : 'border-slate-700 bg-slate-900'
            }`}
          >
            <button
              onClick={() => void toggle(item.id)}
              disabled={toggling === item.id}
              className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
                item.done
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-slate-600 hover:border-[#F7941D]'
              }`}
            >
              {item.done && <span className="text-xs">✓</span>}
              {toggling === item.id && <span className="text-xs text-slate-400">…</span>}
            </button>
            <div className="flex-1">
              <p className={`text-sm font-medium ${item.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                {item.label}
              </p>
              {item.done && item.doneAt && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Completed {new Date(item.doneAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {data.complianceCheckedAt && (
        <p className="text-xs text-slate-600">
          Last updated: {new Date(data.complianceCheckedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
