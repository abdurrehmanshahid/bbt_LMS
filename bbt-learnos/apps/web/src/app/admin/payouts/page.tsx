'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useAuthStore } from '@/lib/store';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

interface AdminPayoutRow {
  id: string;
  creatorName: string;
  creatorDisplayName: string;
  creatorTier: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  requestedAt: string;
  paidAt: string | null;
}

interface AdminPayoutList {
  items: AdminPayoutRow[];
  total: number;
}

async function fetchPayouts(token: string, status: string, page: number): Promise<AdminPayoutList> {
  const params = new URLSearchParams({ page: String(page) });
  if (status !== 'ALL') params.set('status', status);
  const res = await fetch(`${API}/admin/payouts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<AdminPayoutList>;
}

async function processPayout(
  token: string,
  id: string,
  method: string,
  bankRef?: string,
): Promise<void> {
  const res = await fetch(`${API}/admin/payouts/${id}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify({ method, ...(bankRef ? { bankRef } : {}) }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-yellow-400',
  PAID: 'text-green-400',
  FAILED: 'text-red-400',
};

function ProcessModal({
  payout,
  token,
  onClose,
}: {
  payout: AdminPayoutRow;
  token: string;
  onClose: () => void;
}): React.JSX.Element {
  const qc = useQueryClient();
  const [method, setMethod] = useState<'STRIPE_CONNECT' | 'BANK_TRANSFER'>('STRIPE_CONNECT');
  const [bankRef, setBankRef] = useState('');

  const mut = useMutation({
    mutationFn: () => processPayout(token, payout.id, method, method === 'BANK_TRANSFER' ? bankRef : undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-payouts'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 px-4">
      <div className="w-full max-w-md rounded-2xl border border-navy-700 bg-navy-800 p-6">
        <h2 className="font-display text-xl text-white">Process Payout</h2>
        <p className="mt-1 text-sm text-navy-400">
          {payout.creatorDisplayName} — {payout.amount.toLocaleString()} {payout.currency}
        </p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-mono text-navy-400 uppercase tracking-wider">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as typeof method)}
              className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white"
            >
              <option value="STRIPE_CONNECT">Stripe Connect</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </label>

          {method === 'BANK_TRANSFER' && (
            <label className="block">
              <span className="mb-1 block text-xs font-mono text-navy-400 uppercase tracking-wider">Bank Reference</span>
              <input
                value={bankRef}
                onChange={(e) => setBankRef(e.target.value)}
                placeholder="TXN-12345"
                className="w-full rounded-lg border border-navy-600 bg-navy-900 px-3 py-2 text-sm text-white placeholder:text-navy-500"
              />
            </label>
          )}

          {mut.error && (
            <p role="alert" className="text-xs text-red-400">
              {mut.error instanceof Error ? mut.error.message : 'Failed'}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-navy-600 py-2 text-sm font-semibold text-navy-300 hover:border-navy-400"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={mut.isPending || (method === 'BANK_TRANSFER' && !bankRef.trim())}
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {mut.isPending ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPayoutsPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState<AdminPayoutRow | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-payouts', statusFilter, page],
    queryFn: () => fetchPayouts(accessToken!, statusFilter, page),
    enabled: !!accessToken,
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-white">Creator Payouts</h1>
        <span className="text-sm font-mono text-navy-400">{data?.total ?? 0} total</span>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {['ALL', 'PENDING', 'PAID', 'FAILED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-orange-500 text-white'
                : 'border border-navy-600 text-navy-400 hover:border-navy-400'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-navy-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400">{error instanceof Error ? error.message : 'Failed to load payouts'}</p>
      )}

      {data && data.items.length === 0 && (
        <p className="text-sm text-navy-500">No payouts found for this filter.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-navy-700">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-700 bg-navy-800">
              <tr>
                {['Creator', 'Tier', 'Amount', 'Method', 'Status', 'Requested', 'Action'].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700 bg-navy-800/50">
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-navy-750">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-white">{row.creatorDisplayName}</p>
                    <p className="text-xs text-navy-400">{row.creatorName}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-navy-300">T{row.creatorTier}</td>
                  <td className="px-4 py-3 font-mono text-white">
                    {row.amount.toLocaleString()} {row.currency}
                  </td>
                  <td className="px-4 py-3 text-navy-300 text-xs">{row.method.replace('_', ' ')}</td>
                  <td className={`px-4 py-3 font-mono text-xs ${STATUS_COLORS[row.status] ?? 'text-navy-400'}`}>
                    {row.status}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-navy-400">
                    {new Date(row.requestedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => setProcessing(row)}
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                      >
                        Process
                      </button>
                    )}
                    {row.status === 'PAID' && row.paidAt && (
                      <span className="text-xs text-navy-500">{new Date(row.paidAt).toLocaleDateString()}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-navy-600 px-4 py-2 text-xs text-navy-300 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-navy-400">Page {page} of {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-navy-600 px-4 py-2 text-xs text-navy-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {processing && accessToken && (
        <ProcessModal
          payout={processing}
          token={accessToken}
          onClose={() => setProcessing(null)}
        />
      )}
    </div>
  );
}
