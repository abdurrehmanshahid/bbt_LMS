'use client';
import React, { useState, useCallback } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { searchTalent, requestContact, type TalentCard } from '@/lib/employer';

const TRACKS = [
  'GenAI + Agentic AI',
  'Cloud + MLOps',
  'Odoo ERP Development',
  'AI-Integrated Full Stack',
  'Cybersecurity',
  'UI/UX + Brand Design',
  'AI Marketing + Sales',
];

const ABSORPTION_COLOR: Record<string, string> = {
  ELIGIBLE: 'bg-green-100 text-green-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  ABSORBED: 'bg-blue-100 text-blue-700',
  INELIGIBLE: 'bg-gray-100 text-gray-500',
};

function TalentCardComp({
  talent,
  onContact,
}: {
  talent: TalentCard;
  onContact: (id: string) => void;
}) {
  const initials = talent.displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        {talent.avatarUrl ? (
          <img src={talent.avatarUrl} alt={talent.displayName} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#2E3192] flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#0d0d2e] truncate">{talent.displayName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Last active {new Date(talent.lastActive).toLocaleDateString()}
          </p>
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ABSORPTION_COLOR[talent.absorptionStatus] ?? 'bg-gray-100 text-gray-500'}`}>
          {talent.absorptionStatus.replace('_', ' ')}
        </span>
      </div>

      {talent.topBadges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {talent.topBadges.map((b) => (
            <div key={b.id} className="flex items-center gap-1 bg-indigo-50 rounded-full px-2.5 py-1">
              <span className="text-xs text-[#2E3192] font-medium">{b.skill}</span>
              <span className="text-[10px] text-indigo-400">{b.score}%</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onContact(talent.id)}
        className="mt-auto w-full text-sm py-2 rounded-lg bg-[#F7941D] text-white font-medium hover:bg-orange-500 transition-colors"
      >
        Request Contact
      </button>
    </div>
  );
}

function ContactModal({
  learnerId,
  onClose,
  onSend,
}: {
  learnerId: string;
  onClose: () => void;
  onSend: (learnerId: string, message: string) => void;
}) {
  const [message, setMessage] = useState('');
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
        <h2 className="font-semibold text-[#0d0d2e] text-lg">Request Contact</h2>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Introduce yourself and describe the opportunity…"
          rows={4}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={() => { onSend(learnerId, message); onClose(); }}
            className="px-4 py-2 text-sm bg-[#2E3192] text-white rounded-lg hover:bg-indigo-700"
          >
            Send Request
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TalentPage(): React.JSX.Element {
  const token = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [track, setTrack] = useState('');
  const [minScore, setMinScore] = useState('');
  const [contactTarget, setContactTarget] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['talent', track, minScore],
    queryFn: ({ pageParam }) =>
      searchTalent(
        {
          ...(track ? { track } : {}),
          ...(minScore ? { minBadgeScore: parseInt(minScore, 10) } : {}),
          ...(typeof pageParam === 'string' ? { after: pageParam } : {}),
        },
        token!,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!token,
  });

  const contactMut = useMutation({
    mutationFn: ({ learnerId, message }: { learnerId: string; message: string }) =>
      requestContact(learnerId, message || undefined, token!),
    onSuccess: () => {
      setToast('Contact request sent');
      setTimeout(() => setToast(''), 3000);
      void queryClient.invalidateQueries({ queryKey: ['talent'] });
    },
  });

  const allTalent = data?.pages.flatMap((p) => p.items) ?? [];

  const handleContact = useCallback((learnerId: string) => {
    setContactTarget(learnerId);
  }, []);

  const handleSend = useCallback(
    (learnerId: string, message: string) => {
      contactMut.mutate({ learnerId, message });
    },
    [contactMut],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d0d2e]">Find Talent</h1>
        <p className="text-sm text-gray-500 mt-1">Browse verified learners with skill badges</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E3192] bg-white"
        >
          <option value="">All Tracks</option>
          {TRACKS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2E3192] bg-white"
        >
          <option value="">Any Badge Score</option>
          <option value="70">70%+</option>
          <option value="80">80%+</option>
          <option value="90">90%+</option>
        </select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />
          ))}
        </div>
      ) : allTalent.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No learners match your filters</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allTalent.map((t) => (
              <TalentCardComp key={t.id} talent={t} onContact={handleContact} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2.5 text-sm bg-[#0d0d2e] text-white rounded-lg hover:bg-[#1a1a4e] disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {contactTarget && (
        <ContactModal
          learnerId={contactTarget}
          onClose={() => setContactTarget(null)}
          onSend={handleSend}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-green-600 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
