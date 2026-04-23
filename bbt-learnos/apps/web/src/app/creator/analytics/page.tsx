'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { creatorApi } from '@/lib/creator';

type Period = '7d' | '30d' | '90d';

function LineChart({ series }: { series: Array<{ date: string; views: number }> }): React.JSX.Element {
  if (series.length === 0) return <div className="h-40 flex items-center justify-center text-navy-500 text-sm">No data</div>;

  const max = Math.max(...series.map((s) => s.views), 1);
  const W = 600, H = 140, PAD = 10;
  const points = series.map((s, i) => {
    const x = PAD + (i / (series.length - 1 || 1)) * (W - PAD * 2);
    const y = H - PAD - ((s.views / max) * (H - PAD * 2));
    return `${x},${y}`;
  });
  const polyline = points.join(' ');
  const fillPath = `M${points[0]} L${points.slice(1).join(' L')} L${PAD + (W - PAD * 2)},${H - PAD} L${PAD},${H - PAD} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-label="Views over time chart" role="img">
      <defs>
        <linearGradient id="fill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#fill-grad)" />
      <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((s, i) => {
        const x = PAD + (i / (series.length - 1 || 1)) * (W - PAD * 2);
        const y = H - PAD - ((s.views / max) * (H - PAD * 2));
        return <circle key={i} cx={x} cy={y} r={3} fill="#f97316" />;
      })}
    </svg>
  );
}

function HBarChart({ data }: { data: Array<{ title: string; rate: number }> }): React.JSX.Element {
  const top = data.slice(0, 8);
  return (
    <div className="space-y-2.5">
      {top.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs font-mono mb-1">
            <span className="text-navy-300 truncate max-w-[200px]">{d.title}</span>
            <span className="text-navy-400 shrink-0 ml-2">{Math.round(d.rate * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${d.rate * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data }: { data: Array<{ type: string; amount: number }> }): React.JSX.Element {
  const total = data.reduce((s, d) => s + d.amount, 0) || 1;
  const COLORS = ['#f97316', '#6366f1', '#22c55e', '#ec4899'];
  let offset = 0;
  const r = 40, cx = 60, cy = 60, circ = 2 * Math.PI * r;

  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0" aria-hidden="true">
        {data.map((d, i) => {
          const pct = d.amount / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={COLORS[i % COLORS.length] ?? '#f97316'}
              strokeWidth={18}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += pct;
          return el;
        })}
        <circle cx={cx} cy={cy} r={28} fill="#0d0d2e" />
      </svg>
      <div className="space-y-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="text-navy-300">{d.type}</span>
            <span className="text-navy-500 ml-auto font-mono">{d.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [period, setPeriod] = useState<Period>('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['creator-analytics', period],
    queryFn: () => creatorApi.getAnalytics(accessToken!, period),
    enabled: !!accessToken,
  });

  return (
    <div className="p-6 lg:p-8 space-y-7">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-white">Analytics</h1>
        <div className="flex gap-1 rounded-lg border border-navy-700 bg-navy-800 p-1">
          {(['7d', '30d', '90d'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-3 py-1.5 text-xs font-mono transition-colors ${period === p ? 'bg-orange-500 text-white' : 'text-navy-400 hover:text-white'}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl bg-navy-800 h-48 animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Views over time</h2>
              <LineChart series={data.viewSeries} />
            </div>
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Revenue by type</h2>
              <DonutChart data={data.revenueByType} />
            </div>
          </div>

          {/* Completion by content */}
          {data.completionByContent.length > 0 && (
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-5">Completion rate by content</h2>
              <HBarChart data={data.completionByContent} />
            </div>
          )}

          {/* Detailed table */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-navy-700">
              <h2 className="text-sm font-semibold text-white">Per-content breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-navy-700">
                  <tr>
                    {['Title', 'Views', 'Watch min', 'Completion', 'Save rate', 'Pass rate', 'Revenue'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {data.rows.map((row) => (
                    <tr key={row.contentId} className="hover:bg-navy-750 transition-colors">
                      <td className="px-4 py-3 text-white font-medium max-w-[180px] truncate">{row.title}</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{row.views.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{row.watchMinutes.toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{Math.round(row.completionRate * 100)}%</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{Math.round(row.saveRate * 100)}%</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{row.assessmentPassRate !== null ? `${Math.round(row.assessmentPassRate * 100)}%` : '—'}</td>
                      <td className="px-4 py-3 font-mono text-navy-300">{row.revenueAttributed.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Top countries</h2>
              <div className="space-y-2">
                {data.audience.topCountries.map((c) => (
                  <div key={c.country} className="flex items-center gap-3">
                    <span className="text-sm text-navy-300 flex-1">{c.country}</span>
                    <div className="w-24 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500" style={{ width: `${c.pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-navy-400 w-8 text-right">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Devices</h2>
              <div className="space-y-2">
                {Object.entries(data.audience.devices).map(([device, pct]) => (
                  <div key={device} className="flex items-center gap-3">
                    <span className="text-sm text-navy-300 flex-1 capitalize">{device}</span>
                    <div className="w-24 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-mono text-navy-400 w-8 text-right">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
