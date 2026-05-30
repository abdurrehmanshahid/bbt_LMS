'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { creatorApi } from '@/lib/creator';
import type { ModerationItem } from '@/lib/creator';
import { useAuthStore } from '@/lib/store';

const STATUS_COLOR: Record<ModerationItem['status'], string> = {
  REJECTED: 'bg-red-900/40 text-red-400 border-red-800',
  HELD: 'bg-yellow-900/40 text-yellow-400 border-yellow-800',
};

function InboxCard({ item, token }: { item: ModerationItem; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();

  const resubmitMut = useMutation({
    mutationFn: () => creatorApi.resubmit(token, item.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['moderation-inbox'] }),
  });
  const appealMut = useMutation({
    mutationFn: () => creatorApi.appeal(token, item.id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['moderation-inbox'] }),
  });

  return (
    <article className="rounded-2xl border border-navy-700 bg-navy-800">
      <button
        type="button"
        className="w-full flex items-start gap-4 p-5 text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-white text-sm line-clamp-1">{item.title}</h3>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-mono ${STATUS_COLOR[item.status]}`}>
              {item.status === 'REJECTED' ? 'Rejected' : 'Held for review'}
            </span>
          </div>
          <p className="text-xs font-mono text-orange-400 mt-0.5">{item.track}</p>
          <p className="text-xs text-navy-400 mt-1">
            <span className="font-semibold text-navy-200">Reason: </span>
            {item.rejectionReason}
          </p>
        </div>
        <svg
          className={`h-4 w-4 shrink-0 text-navy-400 transition-transform mt-1 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-navy-700 px-5 pb-5 pt-4 space-y-4">
          <div className="rounded-xl bg-navy-900 border border-navy-700 p-4">
            <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Moderator feedback</p>
            <p className="text-sm text-navy-200">{item.feedback}</p>
            {item.timestampReference && (
              <p className="text-xs font-mono text-orange-400 mt-2">📍 Timestamp: {item.timestampReference}</p>
            )}
          </div>
          <p className="text-xs text-navy-500 font-mono">Received: {new Date(item.createdAt).toLocaleDateString()}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => resubmitMut.mutate()}
              disabled={resubmitMut.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
            >
              {resubmitMut.isPending && (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Resubmit
            </button>
            <button
              type="button"
              onClick={() => appealMut.mutate()}
              disabled={appealMut.isPending || appealMut.isSuccess}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-white hover:border-navy-400 disabled:opacity-60 transition-colors"
            >
              {appealMut.isSuccess ? 'Appeal submitted' : 'Appeal'}
            </button>
          </div>
          {(resubmitMut.isError || appealMut.isError) && (
            <p className="text-xs text-red-400">Action failed. Please try again.</p>
          )}
        </div>
      )}
    </article>
  );
}

export default function ModerationInboxPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();

  const { data: items, isLoading } = useQuery({
    queryKey: ['moderation-inbox'],
    queryFn: () => creatorApi.getModerationInbox(accessToken!),
    enabled: !!accessToken,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Moderation Inbox</h1>
        <p className="text-sm text-navy-400 mt-1">Content that needs your attention after review.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-24 animate-pulse" />
          ))}
        </div>
      ) : !items?.length ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-green-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-white">All clear!</p>
          <p className="text-sm text-navy-400 mt-1">No content currently needs attention.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <InboxCard key={item.id} item={item} token={accessToken!} />
          ))}
        </div>
      )}
    </div>
  );
}
