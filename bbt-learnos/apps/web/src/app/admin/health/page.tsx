'use client';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/admin';
import type { PlatformHealth } from '@/lib/admin';

function Sparkline({ values }: { values: number[] }): React.JSX.Element {
  if (values.length < 2) return <svg className="h-8 w-20" />;
  const max = Math.max(...values, 1);
  const W = 80, H = 32;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-8 w-20" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke="#f97316" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ label, value, sub, spark }: { label: string; value: string | number; sub?: string; spark?: number[] }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">{label}</p>
          <p className="mt-1 font-display text-2xl text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-navy-500">{sub}</p>}
        </div>
        {spark && <Sparkline values={spark} />}
      </div>
    </div>
  );
}

function TrackBar({ label, value, max }: { label: string; value: number; max: number }): React.JSX.Element {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-mono mb-1">
        <span className="text-navy-300 truncate max-w-[160px]">{label}</span>
        <span className="text-navy-400 shrink-0 ml-2">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function PipelineDonut({ pipeline }: { pipeline: PlatformHealth['pipeline'] }): React.JSX.Element {
  const items = [
    { label: 'Pending', value: pipeline.pending, color: '#f59e0b' },
    { label: 'Approved', value: pipeline.approved, color: '#22c55e' },
    { label: 'Rejected', value: pipeline.rejected, color: '#ef4444' },
  ];
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = 36, cx = 48, cy = 48, circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 96 96" className="w-24 h-24 shrink-0" aria-hidden="true">
        {items.map((item, i) => {
          const pct = item.value / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={item.color}
              strokeWidth={16}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += pct;
          return el;
        })}
        <circle cx={cx} cy={cy} r={24} fill="#0d0d2e" />
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="600">{total}</text>
      </svg>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color }} />
            <span className="text-navy-300">{item.label}</span>
            <span className="text-navy-500 font-mono ml-auto">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HealthPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-health'],
    queryFn: () => adminApi.getHealth(accessToken!),
    enabled: !!accessToken,
    staleTime: 30_000,
  });

  useEffect(() => {
    const id = setInterval(() => void refetch(), 30_000);
    return () => clearInterval(id);
  }, [refetch]);

  const maxSubs = data ? Math.max(...data.activeSubsByTrack.map((t) => t.count), 1) : 1;
  const maxChurn = data ? Math.max(...data.churnByTrack.map((t) => t.count), 1) : 1;

  return (
    <div className="p-6 lg:p-8 space-y-7">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-white">Platform Health</h1>
        <p className="text-xs font-mono text-navy-500">Auto-refresh every 30s</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="rounded-2xl bg-navy-800 h-24 animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          {/* User activity */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard label="DAU" value={data.dau.toLocaleString()} spark={data.dauSpark} />
            <MetricCard label="WAU" value={data.wau.toLocaleString()} spark={data.wauSpark} />
            <MetricCard label="MAU" value={data.mau.toLocaleString()} />
          </div>

          {/* Revenue */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
            <div className="flex items-start gap-4">
              <div>
                <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">MRR</p>
                <p className="mt-1 font-display text-3xl text-white">{data.currency} {data.mrr.toLocaleString()}</p>
                <p className={`text-xs mt-0.5 font-mono ${data.mrrDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.mrrDelta >= 0 ? '+' : ''}{data.mrrDelta.toFixed(1)}% vs last month
                </p>
              </div>
            </div>
          </div>

          {/* Content pipeline + cohort completion */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Content Pipeline</h2>
              <PipelineDonut pipeline={data.pipeline} />
            </div>
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Cohort Completion by Track</h2>
              <div className="space-y-3">
                {data.cohortCompletion.map((c) => (
                  <div key={c.track}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-navy-300 truncate max-w-[160px]">{c.track}</span>
                      <span className="text-navy-400 shrink-0 ml-2">{Math.round(c.rate * 100)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${c.rate >= 0.7 ? 'bg-green-500' : c.rate >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${c.rate * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active subs + churn */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Active Subscribers by Track</h2>
              <div className="space-y-3">
                {data.activeSubsByTrack.map((t) => (
                  <TrackBar key={t.track} label={t.track} value={t.count} max={maxSubs} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Churn by Track</h2>
              <div className="space-y-3">
                {data.churnByTrack.map((t) => (
                  <TrackBar key={t.track} label={t.track} value={t.count} max={maxChurn} />
                ))}
              </div>
            </div>
          </div>

          {/* Support reasons */}
          {data.topSupportReasons.length > 0 && (
            <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-navy-700">
                <h2 className="text-sm font-semibold text-white">Top Support Reasons</h2>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-navy-700">
                  {data.topSupportReasons.map((r, i) => (
                    <tr key={i} className="hover:bg-navy-750 transition-colors">
                      <td className="px-5 py-3 text-navy-300">{r.reason}</td>
                      <td className="px-5 py-3 text-right font-mono text-navy-400">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
