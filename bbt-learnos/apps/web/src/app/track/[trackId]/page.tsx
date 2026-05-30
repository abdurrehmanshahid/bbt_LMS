'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { learnerApi } from '@/lib/learner';
import type { EnrolledModule } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

const STATUS_CONFIG: Record<EnrolledModule['status'], { label: string; color: string; icon: React.JSX.Element }> = {
  LOCKED: {
    label: 'Locked',
    color: 'text-white/35',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  AVAILABLE: {
    label: 'Open',
    color: 'text-orange-400',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-400',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  ASSESSMENT_PENDING: {
    label: 'Take Assessment',
    color: 'text-indigo-400',
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
  },
};

interface Props {
  params: { trackId: string };
}

export default function EnrolledTrackPage({ params }: Props): React.JSX.Element {
  const router = useRouter();
  const { accessToken, hasHydrated } = useAuthStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken) router.push(`/auth/login?returnUrl=/track/${params.trackId}`);
  }, [accessToken, hasHydrated, router, params.trackId]);

  const { data: track, isLoading, error } = useQuery({
    queryKey: ['enrolled-track', params.trackId],
    queryFn: () => learnerApi.getEnrolledTrack(accessToken!, params.trackId),
    enabled: !!accessToken,
  });

  if (!hasHydrated || !accessToken) return <></>;

  if (isLoading) {
    return (
      <div className="min-h-screen bbt-screen p-8">
        <div className="mx-auto max-w-3xl space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-navy-800 h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="min-h-screen bbt-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-navy-400 mb-4">Track not found or you are not enrolled.</p>
          <Link href="/tracks" className="text-orange-400 hover:underline">Browse tracks →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bbt-screen">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-mono text-navy-400 mb-3">
            <Link href="/dashboard" className="hover:text-navy-200 transition-colors">Dashboard</Link>
            <span aria-hidden="true">/</span>
            <span className="text-navy-200">{track.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl" role="img" aria-label={track.title}>{track.icon}</span>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl text-white">{track.title}</h1>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="flex-1 h-2 rounded-full bg-navy-700 overflow-hidden max-w-xs"
                  role="progressbar"
                  aria-valuenow={track.completionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${track.completionPercent}%` }} />
                </div>
                <span className="text-xs font-mono text-navy-400">{track.completionPercent}% complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module list */}
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-3">
        <div className="mb-5 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4">
          <p className="bbt-kicker mb-2">Enrollment active</p>
          <p className="text-sm text-white/70">
            Your free track is open. Start with the highlighted modules; paid or admin-approved access unlocks the full sequence.
          </p>
        </div>
        <h2 className="font-display text-xl text-white mb-4">Curriculum</h2>
        {track.modules.map((mod) => {
          const cfg = STATUS_CONFIG[mod.status];
          const isClickable = mod.status !== 'LOCKED';

          const inner = (
            <>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-mono font-bold ${
                isClickable ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'bg-white/5 text-white/35'
              }`}>
                {mod.order}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-semibold text-sm ${mod.status === 'LOCKED' ? 'text-white/45' : 'text-white'}`}>
                    {mod.title}
                  </h3>
                  {mod.status === 'LOCKED' && mod.prerequisiteTitle && (
                    <span className="shrink-0 text-xs font-mono text-navy-500 border border-navy-700 rounded px-2 py-0.5">
                      Complete Module: {mod.prerequisiteTitle}
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 line-clamp-1 ${mod.status === 'LOCKED' ? 'text-white/25' : 'text-white/55'}`}>
                  {mod.description}
                </p>
                <p className="text-xs font-mono text-navy-500 mt-1">{mod.estimatedMinutes} min</p>
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-mono shrink-0 ${cfg.color}`}>
                {cfg.icon}
                <span>{cfg.label}</span>
              </div>
            </>
          );

          return isClickable ? (
            <Link
              key={mod.id}
              href={`/track/${params.trackId}/module/${mod.id}`}
              className="flex items-start gap-4 rounded-xl border border-orange-400/25 bg-gradient-to-br from-orange-500/12 to-navy-800 p-4 shadow-lg shadow-black/20 transition-colors hover:border-orange-300/50 hover:bg-navy-750"
            >
              {inner}
            </Link>
          ) : (
            <div
              key={mod.id}
              className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.025] p-4"
            >
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}
