'use client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import React, { useState } from 'react';

import { apiFetch, apiPost } from '@/lib/api';
import type { TrackSummary } from '@/lib/api';

interface DeepLinkItem {
  type: 'ltiResourceLink';
  title: string;
  url: string;
  trackId: string;
}

export default function LtiDeepLinkPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const launchId = searchParams.get('launchId') ?? '';
  const preselectedTrackId = searchParams.get('trackId') ?? '';

  const [selected, setSelected] = useState<Set<string>>(
    preselectedTrackId ? new Set([preselectedTrackId]) : new Set(),
  );
  const [submitted, setSubmitted] = useState(false);

  const { data: tracks, isLoading } = useQuery<TrackSummary[]>({
    queryKey: ['tracks-lti'],
    queryFn: () => apiFetch<TrackSummary[]>('/tracks'),
  });

  const mut = useMutation({
    mutationFn: (items: DeepLinkItem[]) =>
      apiPost('/lti/deep-link/response', { launchId, items }),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const handleSubmit = () => {
    if (!tracks || selected.size === 0) return;
    const items: DeepLinkItem[] = tracks
      .filter((t) => selected.has(t.id))
      .map((t) => ({
        type: 'ltiResourceLink',
        title: t.title,
        url: `${window.location.origin}/track/${t.slug}`,
        trackId: t.id,
      }));
    mut.mutate(items);
  };

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fc]">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-semibold text-[#0d0d2e]">Content embedded successfully</p>
          <p className="text-sm text-gray-500">You can close this window and return to your LMS.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bbt-screen p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-[#0d0d2e] text-white rounded-xl p-5 flex items-center gap-3">
          <img src="/bbt-emblem.png" alt="Big Binary Tech" className="h-8 w-auto" />
          <div>
            <p className="font-semibold text-sm">BBT LearnOS — Deep Linking</p>
            <p className="text-xs text-white/50">Select tracks to embed in your LMS course</p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {(tracks ?? []).map((track) => {
              const isSelected = selected.has(track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => toggle(track.id)}
                  className={`w-full flex items-center gap-4 bg-white rounded-xl border-2 p-4 text-left transition-colors ${
                    isSelected ? 'border-[#2E3192] bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-[#2E3192] bg-[#2E3192]' : 'border-gray-300'
                  }`}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="text-2xl">{track.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#0d0d2e] text-sm">{track.title}</p>
                    <p className="text-xs text-gray-500 truncate">{track.description}</p>
                  </div>
                  <div className="text-xs text-gray-400 shrink-0">{track._count?.modules ?? 0} modules</div>
                </button>
              );
            })}
          </div>
        )}

        <div className="sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={selected.size === 0 || mut.isPending}
            className="w-full py-3 bg-[#F7941D] text-white font-semibold rounded-xl hover:bg-orange-500 disabled:opacity-50 transition-colors shadow-lg"
          >
            {mut.isPending
              ? 'Embedding…'
              : selected.size === 0
              ? 'Select at least one track'
              : `Embed ${selected.size} track${selected.size > 1 ? 's' : ''} in LMS`}
          </button>
        </div>
      </div>
    </div>
  );
}
