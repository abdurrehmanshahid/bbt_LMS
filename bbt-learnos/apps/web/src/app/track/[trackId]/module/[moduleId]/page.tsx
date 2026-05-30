'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { learnerApi } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

type Tab = 'overview' | 'resources' | 'assessment' | 'peers';

interface Props {
  params: { trackId: string; moduleId: string };
}

interface ActiveContent {
  id: string;
  title: string;
  muxPlaybackId: string | null;
}

export default function ModulePage({ params }: Props): React.JSX.Element {
  const router = useRouter();
  const { accessToken, hasHydrated } = useAuthStore();
  const [tab, setTab] = useState<Tab>('overview');
  const [assessmentUnlocked, setAssessmentUnlocked] = useState(false);
  const [activeContent, setActiveContent] = useState<ActiveContent | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken) router.push(`/auth/login?returnUrl=/track/${params.trackId}/module/${params.moduleId}`);
  }, [accessToken, hasHydrated, router, params.trackId, params.moduleId]);

  const { data: mod, isLoading, error } = useQuery({
    queryKey: ['module', params.trackId, params.moduleId],
    queryFn: () => learnerApi.getModule(accessToken!, params.trackId, params.moduleId),
    enabled: !!accessToken,
  });

  const { data: playback } = useQuery({
    queryKey: ['playback', activeContent?.id],
    queryFn: () => learnerApi.getPlaybackUrl(accessToken!, activeContent!.id),
    enabled: !!accessToken && !!activeContent?.id,
  });

  useEffect(() => {
    if (mod?.content.length) {
      const first = mod.content[0];
      if (first) setActiveContent({ id: first.id, title: first.title, muxPlaybackId: first.muxPlaybackId });
    }
  }, [mod]);

  const handleVideoComplete = useCallback((): void => {
    setAssessmentUnlocked(true);
    if (activeContent?.id && accessToken) {
      void learnerApi.trackEvent(accessToken, activeContent.id, 'complete');
    }
  }, [activeContent, accessToken]);

  const handleVideoEvent = useCallback((event: string, payload?: Record<string, unknown>): void => {
    if (activeContent?.id && accessToken) {
      void learnerApi.trackEvent(accessToken, activeContent.id, event, payload);
    }
  }, [activeContent, accessToken]);

  if (!hasHydrated || !accessToken) return <></>;

  if (isLoading) {
    return (
      <div className="min-h-screen bbt-screen p-8">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="aspect-video bg-navy-800 rounded-2xl animate-pulse" />
          <div className="h-10 bg-navy-800 rounded-xl animate-pulse" />
          <div className="h-40 bg-navy-800 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !mod) {
    return (
      <div className="min-h-screen bbt-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-navy-400">Module not found or locked.</p>
          <Link href={`/track/${params.trackId}`} className="text-orange-400 hover:underline">
            ← Back to track
          </Link>
        </div>
      </div>
    );
  }

  const TABS: Array<{ id: Tab; label: string; locked?: boolean }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'resources', label: `Resources${mod.resources.length > 0 ? ` (${mod.resources.length})` : ''}` },
    { id: 'assessment', label: 'Assessment', locked: mod.hasAssessment && !assessmentUnlocked },
    { id: 'peers', label: 'Peer Reviews' },
  ];

  return (
    <div className="min-h-screen bbt-screen">
      {/* Breadcrumb */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-3">
        <nav className="mx-auto max-w-4xl flex items-center gap-2 text-xs font-mono text-navy-400" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-navy-200 transition-colors">Dashboard</Link>
          <span aria-hidden="true">/</span>
          <Link href={`/track/${params.trackId}`} className="hover:text-navy-200 transition-colors">Track</Link>
          <span aria-hidden="true">/</span>
          <span className="text-navy-200 truncate max-w-[200px]">{mod.title}</span>
        </nav>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Video player */}
        {activeContent?.muxPlaybackId && playback ? (
          <div>
            {/* Dynamic import the VideoPlayer to avoid SSR issues */}
            <MuxVideoWrapper
              playbackId={playback.playbackId}
              {...(playback.signedToken ? { signedToken: playback.signedToken } : {})}
              title={activeContent.title}
              onComplete={handleVideoComplete}
              onEvent={handleVideoEvent}
            />
            {/* Content selector if multiple videos */}
            {mod.content.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {mod.content.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveContent({ id: c.id, title: c.title, muxPlaybackId: c.muxPlaybackId })}
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-mono transition-colors ${
                      activeContent.id === c.id
                        ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                        : 'border-navy-700 text-navy-400 hover:border-navy-500'
                    }`}
                  >
                    {c.title}
                    {c.watched && <span className="ml-1 text-green-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
            {!assessmentUnlocked && mod.hasAssessment && (
              <p className="mt-2 text-xs font-mono text-navy-500 text-center">
                Watch 90% to unlock assessment
              </p>
            )}
          </div>
        ) : activeContent && !playback ? (
          <div className="aspect-video rounded-2xl bg-navy-800 flex items-center justify-center">
            <svg className="h-8 w-8 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : null}

        {/* Module header */}
        <div>
          <h1 className="font-display text-3xl text-white">{mod.title}</h1>
          <p className="mt-2 text-navy-300">{mod.description}</p>
          <p className="mt-1 text-xs font-mono text-navy-500">{mod.estimatedMinutes} min estimated</p>
        </div>

        {/* Tabs */}
        <div>
          <div
            className="flex gap-1 border-b border-navy-800 overflow-x-auto"
            role="tablist"
            aria-label="Module sections"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                onClick={() => {
                  if (!t.locked) setTab(t.id);
                }}
                disabled={t.locked}
                className={`shrink-0 px-4 py-2.5 text-sm font-mono transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? 'border-orange-500 text-orange-400'
                    : t.locked
                    ? 'border-transparent text-navy-600 cursor-not-allowed'
                    : 'border-transparent text-navy-400 hover:text-navy-200'
                }`}
              >
                {t.label}
                {t.locked && <span className="ml-1 text-navy-600" aria-hidden="true">🔒</span>}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          <div className="pt-6">
            {tab === 'overview' && (
              <div id="panel-overview" role="tabpanel" className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                  <section className="rounded-2xl border border-navy-700 bg-navy-800 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-orange-400">Hands-on task</p>
                    <h2 className="mt-2 text-lg font-semibold text-white">Apply the concept before moving on</h2>
                    <p className="mt-2 text-sm text-navy-300">
                      Complete the lesson video, read the concepts below, then use the task panel to check your understanding.
                    </p>
                    <div className="mt-4 rounded-xl border border-navy-700 bg-navy-950 p-3 font-mono text-xs text-navy-300">
                      <p>1. Summarize the key idea in one sentence.</p>
                      <p>2. Identify where this appears in a real project.</p>
                      <p>3. Run the check and request a hint if you are stuck.</p>
                    </div>
                  </section>
                  <aside className="rounded-2xl border border-navy-700 bg-navy-800 p-4">
                    <p className="text-xs font-mono uppercase tracking-wider text-indigo-300">Instant feedback</p>
                    <div className="mt-4 space-y-3">
                      <button
                        type="button"
                        className="w-full rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                      >
                        Run Check
                      </button>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-white hover:border-orange-500"
                      >
                        Ask AI Hint
                      </button>
                      <p className="text-xs text-navy-400">
                        AI hints and mentor escalation are staged here; failed attempts will feed the autograder slice next.
                      </p>
                    </div>
                  </aside>
                </div>

                {mod.concepts.length > 0 && (
                  <div>
                    <h2 className="font-display text-lg text-white mb-3">Concepts Covered</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {mod.concepts.map((c) => (
                        <div key={c.id} className="rounded-xl border border-navy-700 bg-navy-800 p-4">
                          <h3 className="text-sm font-semibold text-white">{c.title}</h3>
                          <p className="text-xs text-navy-400 mt-1">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'resources' && (
              <div id="panel-resources" role="tabpanel">
                {mod.resources.length > 0 ? (
                  <div className="space-y-2">
                    {mod.resources.map((r) => (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl border border-navy-700 bg-navy-800 px-4 py-3 hover:border-navy-500 transition-colors group"
                      >
                        <svg className="h-5 w-5 text-navy-400 group-hover:text-orange-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-white">{r.name}</p>
                          <p className="text-xs font-mono text-navy-500">{r.type}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-navy-500 text-sm">No resources attached to this module.</p>
                )}
              </div>
            )}

            {tab === 'assessment' && (
              <div id="panel-assessment" role="tabpanel">
                <div className="rounded-2xl border border-navy-700 bg-navy-800 p-8 text-center max-w-md mx-auto">
                  <div className="mx-auto h-16 w-16 rounded-full bg-indigo-900/40 border border-indigo-700 flex items-center justify-center mb-4">
                    <svg className="h-8 w-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                    </svg>
                  </div>
                  <h2 className="font-display text-xl text-white mb-2">Module Assessment</h2>
                  <div className="flex justify-center gap-6 mb-4 text-sm font-mono text-navy-400">
                    <span>{mod.questionCount} questions</span>
                    <span>Pass: {mod.passingScore}%</span>
                    <span>~{Math.ceil(mod.questionCount * 1.5)} min</span>
                  </div>
                  <p className="text-sm text-navy-400 mb-6">
                    You cannot go back — answer each question before proceeding.
                  </p>
                  <Link
                    href={`/track/${params.trackId}/module/${params.moduleId}/assessment`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-8 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Begin Assessment →
                  </Link>
                </div>
              </div>
            )}

            {tab === 'peers' && (
              <div id="panel-peers" role="tabpanel">
                <div className="rounded-2xl border border-navy-700 bg-navy-800 p-8 text-center">
                  <p className="text-navy-400 text-sm">Peer review submissions will appear here once the module is complete.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lazy-loaded wrapper to avoid SSR issues with HLS.js
function MuxVideoWrapper(props: {
  playbackId: string;
  signedToken?: string;
  title?: string;
  onComplete: () => void;
  onEvent: (event: string, payload?: Record<string, unknown>) => void;
}): React.JSX.Element {
  const [Player, setPlayer] = useState<React.ComponentType<typeof props> | null>(null);

  useEffect(() => {
    // Dynamic import keeps HLS.js out of the SSR bundle
    import('@bbt/ui').then((mod) => {
      setPlayer(() => mod.VideoPlayer as unknown as React.ComponentType<typeof props>);
    }).catch(() => {
      // VideoPlayer not available — show fallback below
    });
  }, []);

  if (!Player) {
    return (
      <div className="aspect-video rounded-2xl bg-navy-800 flex items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return <Player {...props} />;
}
