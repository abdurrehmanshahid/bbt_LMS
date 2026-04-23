'use client';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/admin';
import type { GapRow } from '@/lib/admin';

const TYPE_STYLE: Record<GapRow['type'], { label: string; color: string }> = {
  zero_results: { label: 'Zero results', color: 'text-red-400 bg-red-900/30' },
  low_engagement: { label: 'Low engagement', color: 'text-yellow-400 bg-yellow-900/30' },
};

function exportCsv(rows: GapRow[]): void {
  const header = 'Query,Count,Type,Suggested Track\n';
  const body = rows
    .map((r) => `"${r.query}",${r.count},"${r.type}","${r.suggestedTrack ?? ''}"`)
    .join('\n');
  const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `content-gaps-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function GapsPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-gaps'],
    queryFn: () => adminApi.getGaps(accessToken!),
    enabled: !!accessToken,
  });

  const maxCount = rows ? Math.max(...rows.map((r) => r.count), 1) : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Content Gaps</h1>
          <p className="text-sm text-navy-400 mt-1">Searches with zero results or low engagement — opportunities for new content.</p>
        </div>
        {rows && rows.length > 0 && (
          <button
            type="button"
            onClick={() => exportCsv(rows)}
            className="inline-flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-navy-300 hover:text-white hover:border-navy-400 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-14 animate-pulse" />
          ))}
        </div>
      ) : !rows?.length ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
          <p className="font-semibold text-white">No gaps detected</p>
          <p className="text-sm text-navy-400 mt-1">All searches are returning good results.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">Zero-result queries</p>
              <p className="mt-1 font-display text-2xl text-red-400">
                {rows.filter((r) => r.type === 'zero_results').length}
              </p>
            </div>
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">Low-engagement queries</p>
              <p className="mt-1 font-display text-2xl text-yellow-400">
                {rows.filter((r) => r.type === 'low_engagement').length}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-navy-700">
                <tr>
                  {['Query', 'Searches', 'Type', 'Suggested Track'].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700">
                {rows.map((row, i) => {
                  const pct = (row.count / maxCount) * 100;
                  const style = TYPE_STYLE[row.type];
                  return (
                    <tr key={i} className="hover:bg-navy-750 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{row.query}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-navy-700 overflow-hidden shrink-0">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="font-mono text-navy-400 text-xs">{row.count.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${style.color}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy-400 text-xs">
                        {row.suggestedTrack ?? <span className="text-navy-600">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
