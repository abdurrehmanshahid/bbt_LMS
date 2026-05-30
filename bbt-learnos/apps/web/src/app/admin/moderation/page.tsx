'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { adminApi, REJECTION_REASONS } from '@/lib/admin';
import type { ModerationQueueItem, ModerationDecision, RejectionReason } from '@/lib/admin';
import { useAuthStore } from '@/lib/store';

const CONFIDENCE_COLOR = (n: number) =>
  n >= 0.8 ? 'text-red-400' : n >= 0.5 ? 'text-yellow-400' : 'text-navy-400';

const TIER_LABEL: Record<number, string> = { 1: 'T1', 2: 'T2', 3: 'T3' };
const TIER_COLOR: Record<number, string> = {
  1: 'bg-navy-700 text-navy-300',
  2: 'bg-indigo-900/50 text-indigo-300',
  3: 'bg-orange-900/40 text-orange-300',
};

function DecisionModal({
  item,
  token,
  onClose,
}: {
  item: ModerationQueueItem;
  token: string;
  onClose: () => void;
}): React.JSX.Element {
  const qc = useQueryClient();
  const [decision, setDecision] = useState<ModerationDecision | null>(null);
  const [reason, setReason] = useState<RejectionReason>('QUALITY_LOW');
  const [feedback, setFeedback] = useState(item.aiSuggestedFeedback ?? '');
  const [timestampRef, setTimestampRef] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      if (!decision) throw new Error('No decision selected');
      return adminApi.moderate(token, item.id, decision, {
        ...(decision === 'REJECTED' ? { reason } : {}),
        ...(feedback ? { feedback } : {}),
        ...(timestampRef ? { timestampRef } : {}),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-moderation'] });
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl">
        <div className="flex items-start justify-between gap-3 px-6 py-4 border-b border-navy-700">
          <div className="min-w-0">
            <h2 className="font-semibold text-white truncate">{item.title}</h2>
            <p className="text-xs font-mono text-orange-400 mt-0.5">{item.track} · {item.type}</p>
          </div>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-white transition-colors shrink-0">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Creator info */}
          <div className="flex items-center gap-3 text-sm">
            <span className="text-navy-300">{item.creatorName}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${TIER_COLOR[item.creatorTier]}`}>
              {TIER_LABEL[item.creatorTier]}
            </span>
            {item.creatorFlags > 0 && (
              <span className="text-xs text-red-400 font-mono">{item.creatorFlags} flag{item.creatorFlags !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* AI flags */}
          {item.aiFlags.length > 0 && (
            <div className="rounded-xl bg-navy-950 border border-navy-700 p-3">
              <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">AI Flags</p>
              <div className="flex flex-wrap gap-2">
                {item.aiFlags.map((f, i) => (
                  <span key={i} className={`text-xs font-mono ${CONFIDENCE_COLOR(f.confidence)}`}>
                    {f.category} ({Math.round(f.confidence * 100)}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mux preview */}
          {item.muxPlaybackId && (
            <div className="rounded-xl overflow-hidden bg-black aspect-video">
              <iframe
                src={`https://iframe.mediadelivery.net/embed/${item.muxPlaybackId}`}
                className="w-full h-full"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Content preview"
              />
            </div>
          )}

          {/* Transcript snippet */}
          {item.transcript && (
            <details className="rounded-xl bg-navy-950 border border-navy-700 p-3">
              <summary className="text-xs font-mono text-navy-400 uppercase tracking-wider cursor-pointer">Transcript</summary>
              <p className="mt-2 text-xs text-navy-300 leading-relaxed line-clamp-6">{item.transcript}</p>
            </details>
          )}

          {/* Decision buttons */}
          <div>
            <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Decision</p>
            <div className="flex gap-2">
              {(['APPROVED', 'HELD', 'REJECTED'] as ModerationDecision[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDecision(d)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-colors ${
                    decision === d
                      ? d === 'APPROVED'
                        ? 'bg-green-600 text-white'
                        : d === 'HELD'
                        ? 'bg-yellow-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-navy-800 text-navy-400 hover:text-white border border-navy-600'
                  }`}
                >
                  {d === 'APPROVED' ? 'Approve' : d === 'HELD' ? 'Hold' : 'Reject'}
                </button>
              ))}
            </div>
          </div>

          {/* Rejection reason */}
          {decision === 'REJECTED' && (
            <div>
              <label className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2 block">Reason</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as RejectionReason)}
                className="w-full rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500"
              >
                {REJECTION_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Feedback */}
          <div>
            <label className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2 block">
              Feedback to creator {decision !== 'REJECTED' && <span className="text-navy-600">(optional)</span>}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
              placeholder="Explain the decision…"
              className="w-full rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          {/* Timestamp reference */}
          <div>
            <label className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2 block">
              Timestamp reference <span className="text-navy-600">(optional, e.g. 2:14)</span>
            </label>
            <input
              type="text"
              value={timestampRef}
              onChange={(e) => setTimestampRef(e.target.value)}
              placeholder="mm:ss"
              className="w-full rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>

          {mut.isError && (
            <p className="text-xs text-red-400">Submission failed. Please try again.</p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-navy-700 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-navy-400 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mut.mutate()}
            disabled={!decision || mut.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {mut.isPending && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ModerationPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [selected, setSelected] = useState<ModerationQueueItem | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ['admin-moderation'],
    queryFn: () => adminApi.getModerationQueue(accessToken!),
    enabled: !!accessToken,
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-white">Moderation Queue</h1>
          <p className="text-sm text-navy-400 mt-1">Review and decide on submitted content.</p>
        </div>
        {items && (
          <span className="rounded-full bg-orange-500/15 px-3 py-1 text-sm font-mono text-orange-400">
            {items.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-20 animate-pulse" />
          ))}
        </div>
      ) : !items?.length ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-green-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-semibold text-white">Queue is clear</p>
          <p className="text-sm text-navy-400 mt-1">No content awaiting moderation.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-navy-700">
              <tr>
                {['Title', 'Track', 'Creator', 'Tier', 'AI Flags', 'Uploaded', ''].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-navy-750 transition-colors">
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-white font-medium truncate">{item.title}</p>
                    <p className="text-xs text-navy-500 font-mono">{item.type}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-300 text-xs font-mono">{item.track}</td>
                  <td className="px-4 py-3 text-navy-300">{item.creatorName}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${TIER_COLOR[item.creatorTier]}`}>
                      {TIER_LABEL[item.creatorTier]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.aiFlags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.aiFlags.slice(0, 2).map((f, i) => (
                          <span key={i} className={`text-xs font-mono ${CONFIDENCE_COLOR(f.confidence)}`}>
                            {f.category}
                          </span>
                        ))}
                        {item.aiFlags.length > 2 && (
                          <span className="text-xs text-navy-500">+{item.aiFlags.length - 2}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-navy-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-navy-400 text-xs whitespace-nowrap">
                    {new Date(item.uploadedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                    >
                      Review →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DecisionModal
          item={selected}
          token={accessToken!}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
