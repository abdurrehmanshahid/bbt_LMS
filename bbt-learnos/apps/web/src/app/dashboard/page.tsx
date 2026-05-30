'use client';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useCallback, useState } from 'react';

import { AdSlot } from '@/components/AdSlot';
import { getTaggedShorts } from '@/lib/api';

import { learnerApi } from '@/lib/learner';
import type { FeedItem } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

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

function routeForNonLearner(role: string): string | null {
  if (role === 'ADMIN') return '/admin/health';
  if (role === 'CREATOR') return '/creator/dashboard';
  if (role === 'EMPLOYER') return '/employer/talent';
  if (role === 'FRANCHISE_OWNER') return '/franchise/dashboard';
  return null;
}

function FeedCard({ item }: { item: FeedItem | { id: string; type: string; title: string; thumbnailUrl: string | null; duration: number | null; viewCount: number; creator: { name: string; avatarUrl: string | null }; bucket?: string; track?: { title: string; slug: string } } }) {
  const initials = item.creator.name.slice(0, 2).toUpperCase();
  const bucket = (item as FeedItem).bucket ?? 'PROGRESSION';
  return (
    <article className="bbt-card group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5">
      <div className="aspect-video bg-navy-900 relative">
        {item.thumbnailUrl ? (
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
        <span className={`absolute top-2 left-2 text-xs font-mono ${BUCKET_COLOR[bucket] ?? 'text-navy-400'}`}>
          {bucket.charAt(0) + bucket.slice(1).toLowerCase()}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-xs text-white font-mono">
            {item.creator.avatarUrl ? (
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
  const { user, accessToken, hasHydrated } = useAuthStore();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following' | string>('for_you');

  useEffect(() => {
    if (!hasHydrated) return;
    if (!accessToken) router.push('/auth/login?returnUrl=/dashboard');
    else if (user) {
      const route = routeForNonLearner(user.role);
      if (route) router.replace(route);
    }
  }, [accessToken, hasHydrated, router, user]);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => learnerApi.getDashboard(accessToken!),
    enabled: !!accessToken,
  });

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => learnerApi.getEnrollments(accessToken!),
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
    queryFn: ({ pageParam }) => learnerApi.getFeed(accessToken!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!accessToken && feedTab === 'for_you',
  });

  const {
    data: socialData,
    fetchNextPage: fetchNextSocial,
    hasNextPage: hasNextSocial,
    isFetchingNextPage: fetchingSocial,
    isLoading: socialLoading,
  } = useInfiniteQuery({
    queryKey: ['social-feed'],
    queryFn: ({ pageParam }) => learnerApi.getSocialFeed(accessToken!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!accessToken && feedTab === 'following',
  });

  const {
    data: trackFeedData,
    fetchNextPage: fetchNextTrack,
    hasNextPage: hasNextTrack,
    isFetchingNextPage: fetchingTrack,
    isLoading: trackFeedLoading,
  } = useInfiniteQuery({
    queryKey: ['track-feed', feedTab],
    queryFn: ({ pageParam }) => getTaggedShorts(feedTab, typeof pageParam === 'string' ? pageParam : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!accessToken && feedTab !== 'for_you' && feedTab !== 'following',
  });

  const onIntersect = useCallback((entries: IntersectionObserverEntry[]) => {
    if (!entries[0]?.isIntersecting) return;
    if (feedTab === 'for_you' && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    else if (feedTab === 'following' && hasNextSocial && !fetchingSocial) void fetchNextSocial();
    else if (hasNextTrack && !fetchingTrack) void fetchNextTrack();
  }, [feedTab, hasNextPage, isFetchingNextPage, fetchNextPage, hasNextSocial, fetchingSocial, fetchNextSocial, hasNextTrack, fetchingTrack, fetchNextTrack]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(onIntersect, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [onIntersect]);

  if (!hasHydrated || !accessToken || (user && routeForNonLearner(user.role))) return <></>;

  const forYouItems = feedData?.pages.flatMap((p) => p.items) ?? [];
  const followingItems = socialData?.pages.flatMap((p) => p.items) ?? [];
  const trackItems = trackFeedData?.pages.flatMap((p) => p.items) ?? [];
  const allFeedItems = feedTab === 'for_you' ? forYouItems : feedTab === 'following' ? followingItems : trackItems;
  const isFeedLoading = feedTab === 'for_you' ? feedLoading : feedTab === 'following' ? socialLoading : trackFeedLoading;
  const isLoadingMore = feedTab === 'for_you' ? isFetchingNextPage : feedTab === 'following' ? fetchingSocial : fetchingTrack;

  const progress = dashboard?.trackProgress;
  const cohort = dashboard?.cohort;
  const activeEnrollments = enrollments?.filter((e) => e.status === 'ACTIVE') ?? [];

  const showVerifyBanner = !verifyBannerDismissed && user?.emailVerified === false;

  return (
    <div className="min-h-screen bbt-screen">
      {showVerifyBanner && (
        <div className="flex items-center justify-between gap-4 bg-indigo-900/70 px-4 py-2.5 text-sm text-indigo-200 border-b border-indigo-700/60">
          <span>
            <span className="font-semibold text-white">Verify your email</span>
            {' '}— check your inbox for a link from BBT LearnOS to unlock all features.
          </span>
          <button
            type="button"
            onClick={() => setVerifyBannerDismissed(true)}
            className="shrink-0 text-indigo-400 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {/* Top bar */}
      <div className="border-b border-white/10 bg-[#07071a]/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-white text-lg">
              {user ? `Hi, ${user.name.split(' ')[0]}` : 'Dashboard'}
            </span>
            {(dashboard?.streak ?? 0) > 0 && (
              <span className="bbt-chip bbt-chip-active px-2.5 py-1">
                🔥 {dashboard?.streak}d streak
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Notifications"
            className="bbt-button-secondary relative h-10 w-10 p-0 text-white/55 hover:text-white"
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
              <div className="bbt-card p-5">
                <p className="bbt-kicker mb-3">Your Track</p>
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
                    className="bbt-progress"
                    role="progressbar"
                    aria-valuenow={progress.completionPercent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="bbt-progress-fill transition-all"
                      style={{ width: `${progress.completionPercent}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-navy-400 mb-4">{progress.nextStep}</p>
                <Link
                  href={`/track/${progress.trackId}`}
                  className="bbt-button-primary block py-2 text-center text-xs"
                >
                  Continue Learning →
                </Link>
              </div>
            ) : (
              <div className="bbt-card p-5 text-center">
                <p className="text-sm text-navy-400 mb-4">You haven&apos;t enrolled in a track yet.</p>
                <Link
                  href="/tracks"
                  className="bbt-button-primary block py-2 text-center text-xs"
                >
                  Browse Tracks →
                </Link>
              </div>
            )}

            {/* Quick links */}
            <div className="bbt-card p-4 space-y-1">
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
            {/* Feed tabs */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-none">
              {[
                { key: 'for_you', label: 'For You' },
                { key: 'following', label: 'Following' },
                ...activeEnrollments.map((e) => ({ key: e.track.slug, label: `${e.track.icon} ${e.track.title}` })),
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFeedTab(key)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-mono transition-colors ${
                    feedTab === key
                      ? 'bg-orange-500 text-white'
                      : 'bg-navy-800 text-navy-300 hover:bg-navy-700 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {isFeedLoading ? (
              <FeedSkeleton />
            ) : allFeedItems.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {allFeedItems.map((item, idx) => (
                    <React.Fragment key={item.id}>
                      <FeedCard item={item} />
                      {(idx + 1) % 5 === 0 && (
                        <div className="sm:col-span-2">
                          <AdSlot slot="feed-inline" className="w-full" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
                  {isLoadingMore && (
                    <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </div>
              </>
            ) : (
              <div className="bbt-card p-12 text-center">
                {feedTab === 'following' ? (
                  <p className="text-navy-400">Follow some creators to see their content here.</p>
                ) : feedTab === 'for_you' ? (
                  <p className="text-navy-400">Your track content is being set up — check back soon.</p>
                ) : (
                  <p className="text-navy-400">No reels yet for this track. Check back soon.</p>
                )}
              </div>
            )}
          </div>

          {/* Right — Cohort + sessions */}
          <aside className="space-y-4">
            {cohort ? (
              <div className="bbt-card p-5">
                <p className="bbt-kicker mb-3">Your Cohort</p>
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
              <div className="bbt-card p-5 text-center">
                <p className="text-xs text-navy-500 font-mono uppercase tracking-wider mb-2">Cohort</p>
                <p className="text-sm text-navy-400">Enroll in a track to join a cohort.</p>
              </div>
            )}

            {(dashboard?.upcomingSessions.length ?? 0) > 0 && (
              <div className="bbt-card p-5">
                <p className="bbt-kicker mb-3">Upcoming Sessions</p>
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
