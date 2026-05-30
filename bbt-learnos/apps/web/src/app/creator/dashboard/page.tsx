'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import React from 'react';

import { creatorApi } from '@/lib/creator';
import type { ContentRow, ContentStatus } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

const TIER_LABEL = { 1: 'Emerging', 2: 'Established', 3: 'Expert' } as const;
const TIER_COLOR = { 1: 'text-navy-400', 2: 'text-indigo-400', 3: 'text-orange-400' } as const;

const STATUS_PILL: Record<ContentStatus, { label: string; cls: string }> = {
  APPROVED: { label: 'Approved', cls: 'bg-green-900/40 text-green-400 border-green-800' },
  PENDING_MODERATION: { label: 'In Review', cls: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-900/40 text-red-400 border-red-800' },
  HELD: { label: 'Held', cls: 'bg-orange-900/40 text-orange-400 border-orange-800' },
  DRAFT: { label: 'Draft', cls: 'bg-navy-700 text-navy-400 border-navy-600' },
};

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
      <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">{label}</p>
      <p className="mt-2 font-display text-3xl text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-navy-500">{sub}</p>}
    </div>
  );
}

function ContentTable({ rows }: { rows: ContentRow[] }) {
  const [sortKey, setSortKey] = React.useState<keyof ContentRow>('views');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  function toggleSort(key: keyof ContentRow) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...rows].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  function SortTh({ col, label }: { col: keyof ContentRow; label: string }) {
    const active = sortKey === col;
    return (
      <th scope="col" className="px-4 py-3 text-left">
        <button
          type="button"
          onClick={() => toggleSort(col)}
          className={`flex items-center gap-1 text-xs font-mono uppercase tracking-wider transition-colors ${active ? 'text-orange-400' : 'text-navy-500 hover:text-navy-300'}`}
        >
          {label}
          <span aria-hidden="true">{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
        </button>
      </th>
    );
  }

  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-navy-700">
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider">Title</th>
              <SortTh col="views" label="Views" />
              <SortTh col="completionRate" label="Completion" />
              <SortTh col="saveRate" label="Save rate" />
              <th scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {sorted.map((row) => {
              const pill = STATUS_PILL[row.status];
              return (
                <tr key={row.id} className="hover:bg-navy-750 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white line-clamp-1 max-w-[220px]">{row.title}</p>
                    <p className="text-xs font-mono text-orange-400 mt-0.5">{row.track}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-navy-300">{row.views.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono text-navy-300">{Math.round(row.completionRate * 100)}%</td>
                  <td className="px-4 py-3 font-mono text-navy-300">{Math.round(row.saveRate * 100)}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-mono ${pill.cls}`}>
                      {pill.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/creator/content/${row.id}`}
                      className="text-xs font-mono text-navy-400 hover:text-white transition-colors"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <div className="px-4 py-10 text-center text-navy-500 text-sm">
          No content yet. <Link href="/creator/upload" className="text-orange-400 hover:underline">Upload your first video →</Link>
        </div>
      )}
    </div>
  );
}

// Need React for useState in ContentTable

export default function CreatorDashboardPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['creator-dashboard'],
    queryFn: () => creatorApi.getDashboard(accessToken!),
    enabled: !!accessToken,
  });

  if (isLoading || !data) {
    return (
      <div className="p-8 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-24 animate-pulse" />
          ))}
        </div>
        <div className="rounded-2xl bg-navy-800 h-64 animate-pulse" />
      </div>
    );
  }

  const { kpis, recentContent } = data;
  const tierPct = Math.min(Math.round(kpis.qualityScore * 100), 100);

  return (
    <div className="p-6 lg:p-8 space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-white">Creator Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/creator/upload"
            className="inline-flex h-9 items-center rounded-lg border border-navy-600 px-4 text-sm font-semibold text-white transition-colors hover:border-navy-400"
          >
            Upload
          </Link>
          <Link
            href="/creator/upload"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Post a Reel
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Views (30d)" value={kpis.views30d.toLocaleString()} />
        <KpiCard label="Completion rate" value={`${Math.round(kpis.completionRate * 100)}%`} sub="avg all content" />
        <KpiCard label={`Revenue (${kpis.currency})`} value={kpis.revenueMonth.toLocaleString()} sub="this month" />
        <KpiCard label="Subscribers" value={kpis.subscriberCount.toLocaleString()} />
      </div>

      {/* Tier badge */}
      <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5 flex items-center gap-5">
        <div className="shrink-0 text-center">
          <span className={`font-display text-4xl ${TIER_COLOR[kpis.tier]}`}>{kpis.tier}</span>
          <p className="text-xs font-mono text-navy-500 mt-0.5">Tier</p>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-semibold ${TIER_COLOR[kpis.tier]}`}>{TIER_LABEL[kpis.tier]}</p>
            <p className="text-xs font-mono text-navy-400">Quality score: {tierPct}%</p>
          </div>
          <div className="h-2 rounded-full bg-navy-700 overflow-hidden" role="progressbar" aria-valuenow={tierPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-orange-500" style={{ width: `${tierPct}%` }} />
          </div>
          {kpis.tier < 3 && (
            <p className="text-xs text-navy-500 mt-1">
              Reach quality score 80%+ with &lt;2 flags to advance to Tier {kpis.tier + 1}
            </p>
          )}
        </div>
        {kpis.moderationFlags > 0 && (
          <div className="shrink-0 rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-center">
            <p className="text-lg font-display text-red-400">{kpis.moderationFlags}</p>
            <p className="text-xs font-mono text-red-500">flags</p>
          </div>
        )}
      </div>

      {/* Content table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-white">Content Performance</h2>
          <Link href="/creator/analytics" className="text-xs font-mono text-orange-400 hover:text-orange-300 transition-colors">
            Full analytics →
          </Link>
        </div>
        <ContentTable rows={recentContent} />
      </div>
    </div>
  );
}
