'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminApi } from '@/lib/admin';
import type { TierReviewItem } from '@/lib/admin';
import { useAuthStore } from '@/lib/store';

type Decision = 'APPROVE' | 'REJECT' | 'REQUEST_MORE';

const DECISION_STYLE: Record<Decision, string> = {
  APPROVE: 'bg-green-600 text-white hover:bg-green-700',
  REJECT: 'bg-red-600 text-white hover:bg-red-700',
  REQUEST_MORE: 'bg-navy-700 text-white hover:bg-navy-600 border border-navy-500',
};

const DECISION_LABEL: Record<Decision, string> = {
  APPROVE: 'Approve Tier 2',
  REJECT: 'Reject',
  REQUEST_MORE: 'Request More Info',
};

function QualityBar({ score }: { score: number }): React.JSX.Element {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-navy-400 w-8 text-right">{score}</span>
    </div>
  );
}

function ReviewCard({ item, token }: { item: TierReviewItem; token: string }): React.JSX.Element {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<Decision | null>(null);
  const [reason, setReason] = useState('');

  const mut = useMutation({
    mutationFn: (d: Decision) => adminApi.decideTier(token, item.creatorId, d, reason || undefined),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-tier-review'] }),
  });

  return (
    <article className="rounded-2xl border border-navy-700 bg-navy-800">
      <button
        type="button"
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="h-10 w-10 rounded-full bg-navy-700 shrink-0 flex items-center justify-center text-navy-400 text-sm font-semibold">
            {item.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{item.name}</p>
            <span className="shrink-0 rounded-full bg-indigo-900/40 px-2 py-0.5 text-xs font-mono text-indigo-300">
              T{item.currentTier} → T{item.currentTier + 1}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <div className="flex-1 max-w-[160px]">
              <QualityBar score={item.qualityScore} />
            </div>
            {item.flags > 0 && (
              <span className="text-xs font-mono text-red-400">{item.flags} flag{item.flags !== 1 ? 's' : ''}</span>
            )}
            <span className="text-xs text-navy-500 ml-auto">Applied {new Date(item.appliedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-navy-400 transition-transform mt-1.5 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-navy-700 px-5 pb-5 pt-4 space-y-4">
          {/* Credentials */}
          {item.credentials && (
            <div className="rounded-xl bg-navy-900 border border-navy-700 p-3">
              <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-1">Credentials</p>
              <p className="text-sm text-navy-200">{item.credentials}</p>
            </div>
          )}

          {/* Top content */}
          {item.topContent.length > 0 && (
            <div>
              <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Top Content</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {item.topContent.map((c) => (
                  <div key={c.id} className="rounded-xl bg-navy-900 border border-navy-700 p-3">
                    {c.thumbnailUrl && (
                      <img src={c.thumbnailUrl} alt="" className="w-full h-24 rounded-lg object-cover mb-2" />
                    )}
                    <p className="text-xs text-white font-medium line-clamp-2">{c.title}</p>
                    <p className="text-xs font-mono text-navy-400 mt-1">{Math.round(c.completionRate * 100)}% completion</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional reason */}
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional reason or notes…"
            className="w-full rounded-lg border border-navy-600 bg-navy-900 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500 resize-none"
          />

          {/* Decision buttons */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DECISION_LABEL) as Decision[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setPending(d);
                  mut.mutate(d);
                }}
                disabled={mut.isPending}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${DECISION_STYLE[d]}`}
              >
                {mut.isPending && pending === d ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {DECISION_LABEL[d]}
                  </span>
                ) : DECISION_LABEL[d]}
              </button>
            ))}
          </div>
          {mut.isError && <p className="text-xs text-red-400">Action failed. Please try again.</p>}
        </div>
      )}
    </article>
  );
}

export default function TierReviewPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-tier-review'],
    queryFn: () => adminApi.getTierReviewQueue(accessToken!),
    enabled: !!accessToken,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Creator Tier Review</h1>
          <p className="text-sm text-navy-400 mt-1">Evaluate creators applying for Tier 2 status.</p>
        </div>
        {items && (
          <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-sm font-mono text-indigo-400">
            {items.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-20 animate-pulse" />
          ))}
        </div>
      ) : !items?.length ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-green-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-white">No pending reviews</p>
          <p className="text-sm text-navy-400 mt-1">All tier applications have been processed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewCard key={item.creatorId} item={item} token={accessToken!} />
          ))}
        </div>
      )}
    </div>
  );
}
