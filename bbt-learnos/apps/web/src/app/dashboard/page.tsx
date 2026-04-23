'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { learnerApi } from '@/lib/learner';
import type { FeedItem } from '@/lib/learner';

const BUCKET_COLOR: Record<string, string> = {
  PROGRESSION: 'text-orange-500',
  REINFORCEMENT: 'text-indigo-400',
  ADJACENT: 'text-green-400',
  SOCIAL: 'text-pink-400',
};

const TYPE_LABEL: Record<string, string> = {
  REEL: 'Reel',
  LECTURE: 'Lecture',
  LIVE_RECORDING: 'Recording',
  RESOURCE: 'Resource',
};

function FeedCard({ item }: { item: FeedItem }) {
  const initials = item.creator.name.slice(0, 2).toUpperCase();
  return (
    <article className="group flex flex-col rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden hover:shadow-lg hover:shadow-navy-900/30 transition-shadow">
      <div className="aspect-video bg-navy-900 relative">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-navy-600">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
          </div>
        )}
        {item.duration && (
          <span className="absolute bottom-2 right-2 rounded bg-navy-950/80 px-1.5 py-0.5 text-xs font-mono text-white">
            {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
          </span>
        )}
        <span className={`absolute top-2 left-2 text-xs font-mono ${BUCKET_COLOR[item.bucket] ?? 'text-navy-400'}`}>
          {item.bucket.charAt(0) + item.bucket.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-mono">
            {item.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.creator.avatarUrl} alt={item.creator.name} className="h-full w-full rounded-full object-cover" />
            ) : initials}
          </div>
          <span className="text-xs text-navy-400 truncate">{item.creator.name}</span>
          <span className="ml-auto text-xs font-mono text-navy-500">{TYPE_LABEL[item.type] ?? item.type}</span>
        </div>
        <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
          {item.title}
        </h3>
        <p className="mt-auto text-xs font-mono text-navy-500">{item.viewCount.toLocaleString()} views</p>
      </div>
    </article>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden animate-pulse">
          <div className="aspect-video bg-navy-700" />
          <div className="p-4 space-y-2">
            <div className="h-3 bg-navy-700 rounded w-3/4" />
            <div className="h-3 bg-navy-700 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage(): React.JSX.Element {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accessToken) router.push('/auth/login?returnUrl=/dashboard');
  }, [accessToken, router]);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => learnerApi.getDashboard(accessToken!),
    enabled: !!accessToken,
  });

  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => learnerApi.getFeed(accessToken!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!accessToken,
  });

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onIntersect]);

  if (!accessToken) return <></>;

  const allFeedItems = feedData?.pages.flatMap((p) => p.items) ?? [];
  const progress = dashboard?.trackProgress;
  const cohort = dashboard?.cohort;

  return (
    <div className="min-h-screen bg-navy-950">
      {/* Top bar */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-3">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-white text-lg">
              {user ? `Hi, ${user.name.split(' ')[0]}` : 'Dashboard'}
            </span>
            {(dashboard?.streak ?? 0) > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-orange-500/20 border border-orange-500/40 px-2.5 py-0.5 text-xs font-mono text-orange-400">
                🔥 {dashboard?.streak}d streak
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-navy-400 hover:text-white hover:bg-navy-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            {(dashboard?.notificationCount ?? 0) > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-orange-500" aria-label={`${dashboard?.notificationCount} unread`} />
            )}
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">

          {/* Left — Track progress */}
          <aside className="space-y-4">
            {progress ? (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
                <p className="text-xs font-mono text-orange-500 uppercase tracking-wider mb-3">Your Track</p>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl" role="img" aria-label={progress.trackTitle}>{progress.trackIcon}</span>
                  <div>
                    <p className="font-semibold text-white text-sm">{progress.trackTitle}</p>
                    <p className="text-xs text-navy-400">{progress.currentModuleTitle}</p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs font-mono text-navy-400 mb-1">
                    <span>Progress</span>
                    <span>{progress.completionPercent}%</span>
                  </div>
                  <div
                    className="h-2 rounded-full bg-navy-700 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={progress.completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${progress.completionPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-navy-400 mb-4">{progress.nextStep}</p>
                <Link
                  href={`/track/${progress.trackId}`}
                  className="block text-center rounded-lg bg-orange-500 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Continue Learning →
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5 text-center">
                <p className="text-sm text-navy-400 mb-4">You haven&apos;t enrolled in a track yet.</p>
                <Link
                  href="/tracks"
                  className="block text-center rounded-lg bg-orange-500 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Browse Tracks →
                </Link>
              </div>
            )}

            {/* Quick links */}
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-4 space-y-1">
              {[
                { href: '/learner/portfolio', label: 'My Portfolio' },
                { href: '/jobs', label: 'Job Board' },
                { href: '/creators', label: 'Creators' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-navy-300 hover:bg-navy-700 hover:text-white transition-colors"
                >
                  {link.label}
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </aside>

          {/* Center — Feed */}
          <div>
            <h2 className="font-display text-xl text-white mb-5">Your Feed</h2>
            {feedLoading ? (
              <FeedSkeleton />
            ) : allFeedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {allFeedItems.map((item) => (
                    <FeedCard key={item.id} item={item} />
                  ))}
                </div>
                <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
                  {isFetchingNextPage && (
                    <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
                <p className="text-navy-400">Your track content is being set up — check back soon.</p>
              </div>
            )}
          </div>

          {/* Right — Cohort + sessions */}
          <aside className="space-y-4">
            {cohort ? (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
                <p className="text-xs font-mono text-indigo-400 uppercase tracking-wider mb-3">Your Cohort</p>
                <p className="font-semibold text-white text-sm mb-1">{cohort.name}</p>
                <p className="text-xs text-navy-400 mb-4">{cohort.memberCount} members</p>
                <div className="space-y-2">
                  {cohort.recentActivity.slice(0, 4).map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <div className="h-5 w-5 shrink-0 rounded-full bg-indigo-800 flex items-center justify-center text-indigo-300 font-mono text-xs">
                        {a.memberName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-navy-200 font-medium">{a.memberName}</span>
                        <span className="text-navy-500"> {a.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5 text-center">
                <p className="text-xs text-navy-500 font-mono uppercase tracking-wider mb-2">Cohort</p>
                <p className="text-sm text-navy-400">Enroll in a track to join a cohort.</p>
              </div>
            )}

            {(dashboard?.upcomingSessions.length ?? 0) > 0 && (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
                <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-3">Upcoming Sessions</p>
                <div className="space-y-3">
                  {dashboard?.upcomingSessions.map((s) => (
                    <div key={s.id} className="rounded-lg bg-navy-700/50 p-3">
                      <p className="text-sm font-medium text-white line-clamp-1">{s.title}</p>
                      <p className="text-xs font-mono text-orange-400 mt-0.5">{s.trackTitle}</p>
                      <p className="text-xs text-navy-400 mt-1">
                        {new Date(s.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

        </div>
      </div>
    </div>
  );
}
