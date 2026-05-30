'use client';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/lib/admin';
import type { FranchiseRow } from '@/lib/admin';
import { useAuthStore } from '@/lib/store';

const COMPLIANCE_CONFIG: Record<FranchiseRow['complianceStatus'], { label: string; dot: string; row: string }> = {
  green: { label: 'Compliant', dot: 'bg-green-400', row: '' },
  yellow: { label: 'Attention needed', dot: 'bg-yellow-400', row: 'bg-yellow-950/20' },
  red: { label: 'Non-compliant', dot: 'bg-red-500', row: 'bg-red-950/20' },
};

function ComplianceDot({ status }: { status: FranchiseRow['complianceStatus'] }): React.JSX.Element {
  const cfg = COMPLIANCE_CONFIG[status];
  return (
    <span className="flex items-center gap-1.5 text-xs font-mono">
      <span className={`inline-block h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }): React.JSX.Element {
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
      <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">{label}</p>
      <p className="mt-1 font-display text-2xl text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-navy-500">{sub}</p>}
    </div>
  );
}

export default function FranchisesPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin-franchises'],
    queryFn: () => adminApi.getFranchises(accessToken!),
    enabled: !!accessToken,
  });

  const totalLearners = rows?.reduce((s, r) => s + r.activeLearners, 0) ?? 0;
  const totalRevenue = rows?.reduce((s, r) => s + r.revenueMonth, 0) ?? 0;
  const avgCompletion = rows?.length
    ? Math.round(rows.reduce((s, r) => s + r.completionRate, 0) / rows.length * 100)
    : 0;
  const redCount = rows?.filter((r) => r.complianceStatus === 'red').length ?? 0;
  const currency = rows?.[0]?.currency ?? 'PKR';

  return (
    <div className="p-6 lg:p-8 space-y-7">
      <div>
        <h1 className="font-display text-2xl text-white">Franchises</h1>
        <p className="text-sm text-navy-400 mt-1">Overview of BBT Education franchise locations.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl bg-navy-800 h-24 animate-pulse" />)}
        </div>
      ) : rows ? (
        <>
          {/* Summary row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard label="Total Franchises" value={rows.length} />
            <SummaryCard label="Active Learners" value={totalLearners.toLocaleString()} />
            <SummaryCard label={`Revenue (${currency})`} value={totalRevenue.toLocaleString()} sub="this month" />
            <SummaryCard
              label="Non-compliant"
              value={redCount}
              sub={redCount > 0 ? 'Require action' : 'All clear'}
            />
          </div>

          {/* Completion summary */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Avg. Completion Rate Across Network</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-2 rounded-full bg-navy-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${avgCompletion >= 70 ? 'bg-green-500' : avgCompletion >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${avgCompletion}%` }}
                />
              </div>
              <span className="text-sm font-mono text-white shrink-0">{avgCompletion}%</span>
            </div>
          </div>

          {/* Franchise table */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-navy-700">
                  <tr>
                    {['Franchise', 'City', 'Active Learners', 'Completion', `Revenue (${currency})`, 'PSDA', 'NAVTTC', 'Compliance'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {rows.map((row) => {
                    const rowBg = COMPLIANCE_CONFIG[row.complianceStatus].row;
                    return (
                      <tr key={row.id} className={`hover:bg-navy-750 transition-colors ${rowBg}`}>
                        <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                        <td className="px-4 py-3 text-navy-300">{row.city}</td>
                        <td className="px-4 py-3 font-mono text-navy-300">{row.activeLearners.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-navy-700 overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full ${row.completionRate >= 0.7 ? 'bg-green-500' : row.completionRate >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${row.completionRate * 100}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-navy-400">{Math.round(row.completionRate * 100)}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-navy-300">{row.revenueMonth.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${row.psda === 'ACTIVE' ? 'text-green-400 bg-green-900/30' : 'text-navy-500 bg-navy-700'}`}>
                            {row.psda}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${row.navttc === 'ACTIVE' ? 'text-green-400 bg-green-900/30' : 'text-navy-500 bg-navy-700'}`}>
                            {row.navttc}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <ComplianceDot status={row.complianceStatus} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
