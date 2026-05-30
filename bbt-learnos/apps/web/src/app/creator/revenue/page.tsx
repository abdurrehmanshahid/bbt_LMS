'use client';
import { useQuery, useMutation } from '@tanstack/react-query';

import { creatorApi } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

function ConnectSection({ token }: { token: string }): React.JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['connect-status'],
    queryFn: () => creatorApi.getConnectStatus(token),
  });
  const onboardMut = useMutation({
    mutationFn: () => creatorApi.onboardStripeConnect(token),
    onSuccess: (res) => {
      if (res.url) window.location.href = res.url;
    },
  });

  if (isLoading) return <span className="text-xs text-navy-500">Loading…</span>;
  if (data?.onboarded) {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-900/30 px-3 py-1 text-xs font-semibold text-green-400">Connected ✓</span>;
  }
  return (
    <button
      type="button"
      onClick={() => onboardMut.mutate()}
      disabled={onboardMut.isPending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
    >
      {onboardMut.isPending ? 'Redirecting…' : 'Connect bank account'}
    </button>
  );
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'text-green-400',
  PENDING: 'text-yellow-400',
  FAILED: 'text-red-400',
};

export default function RevenuePage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['creator-revenue'],
    queryFn: () => creatorApi.getRevenue(accessToken!),
    enabled: !!accessToken,
  });

  const payoutMut = useMutation({
    mutationFn: () => creatorApi.requestPayout(accessToken!),
    onSuccess: () => void refetch(),
  });

  const canPayout = data && data.pendingPayout >= data.minPayoutThreshold;

  return (
    <div className="p-6 lg:p-8 space-y-7">
      <h1 className="font-display text-2xl text-white">Revenue</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="rounded-2xl bg-navy-800 h-28 animate-pulse" />)}
        </div>
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total earned', value: data.totalEarned, sub: `${data.currency} lifetime` },
              { label: 'Pending payout', value: data.pendingPayout, sub: canPayout ? 'Ready to withdraw' : `Min ${data.minPayoutThreshold.toLocaleString()} ${data.currency}` },
              { label: 'Paid out', value: data.paidOut, sub: `${data.currency} lifetime` },
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
                <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">{card.label}</p>
                <p className="mt-2 font-display text-3xl text-white">{card.value.toLocaleString()}</p>
                <p className={`mt-0.5 text-xs ${card.label === 'Pending payout' && canPayout ? 'text-green-400' : 'text-navy-500'}`}>{card.sub}</p>
              </div>
            ))}
          </div>

          {/* Payout CTA */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-white">Request payout</p>
              <p className="text-sm text-navy-400 mt-0.5">
                {canPayout
                  ? `${data.pendingPayout.toLocaleString()} ${data.currency} available to withdraw.`
                  : `Minimum payout is ${data.minPayoutThreshold.toLocaleString()} ${data.currency}. You have ${data.pendingPayout.toLocaleString()} ${data.currency}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => payoutMut.mutate()}
              disabled={!canPayout || payoutMut.isPending || payoutMut.isSuccess}
              className="shrink-0 inline-flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {payoutMut.isPending && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {payoutMut.isSuccess ? 'Requested!' : 'Withdraw'}
            </button>
          </div>

          {/* Revenue breakdown */}
          {data.breakdown.length > 0 && (
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Revenue by source</h2>
              <div className="space-y-3">
                {data.breakdown.map((b) => {
                  const total = data.breakdown.reduce((s, x) => s + x.amount, 0) || 1;
                  const pct = (b.amount / total) * 100;
                  return (
                    <div key={b.source}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-navy-300">{b.source}</span>
                        <span className="font-mono text-navy-400">{b.amount.toLocaleString()} {data.currency}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                        <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payout history */}
          {data.history.length > 0 && (
            <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-navy-700">
                <h2 className="text-sm font-semibold text-white">Payout history</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-navy-700">
                  <tr>
                    {['Date', 'Amount', 'Method', 'Status'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {data.history.map((row) => (
                    <tr key={row.id} className="hover:bg-navy-750 transition-colors">
                      <td className="px-4 py-3 font-mono text-navy-300">{new Date(row.paidAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-mono text-white">{row.amount.toLocaleString()} {data.currency}</td>
                      <td className="px-4 py-3 text-navy-300">{row.method}</td>
                      <td className={`px-4 py-3 font-mono text-xs ${STATUS_COLOR[row.status] ?? 'text-navy-400'}`}>{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Bank settings / Connect */}
          <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5 flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">Payment settings</p>
              <p className="text-sm text-navy-400 mt-0.5">Connect your bank account via Stripe for instant payouts.</p>
            </div>
            <ConnectSection token={accessToken!} />
          </div>
        </>
      ) : null}
    </div>
  );
}
