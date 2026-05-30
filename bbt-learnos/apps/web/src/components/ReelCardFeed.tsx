'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getShortsFeed, trackReelEvent, type ShortFeedItem } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { homeForRole } from '@/lib/utils';

// ─── Auth CTA ────────────────────────────────────────────────────────────────

function AuthCTA(): React.JSX.Element {
  const { user, accessToken, hasHydrated } = useAuthStore();
  if (!hasHydrated) {
    return <span className="h-9 w-24 animate-pulse rounded-full bg-white/10" />;
  }
  if (accessToken && user) {
    return (
      <Link
        href={homeForRole(user.role)}
        className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Dashboard →
      </Link>
    );
  }
  return (
    <Link
      href="/auth/signup"
      className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
    >
      Start Free
    </Link>
  );
}

// ─── Individual reel card ─────────────────────────────────────────────────────

function ReelCard({ item, active }: { item: ShortFeedItem; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubeThumbnail = item.youtubeId
    ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`
    : null;

  useEffect(() => {
    if (item.muxPlaybackId && videoRef.current) {
      if (active) void videoRef.current.play().catch(() => undefined);
      else videoRef.current.pause();
    }
  }, [active, item.muxPlaybackId]);

  useEffect(() => {
    if (active) void trackReelEvent(item.id, 'reel_view').catch(() => undefined);
  }, [active, item.id]);

  const displayTags = item.tags.length > 0 ? item.tags : [item.track.slug];
  const creatorName = item.creator.creatorProfile?.displayName ?? item.creator.name;

  return (
    <article className="w-full rounded-2xl overflow-hidden border border-white/10 bg-navy-900 shadow-xl shadow-black/30">
      {/* 9:16 video box */}
      <div className="relative w-full aspect-[9/16] bg-navy-950 overflow-hidden">
        {item.muxPlaybackId ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            poster={item.thumbnailUrl ?? undefined}
            src={`https://stream.mux.com/${item.muxPlaybackId}.m3u8`}
            muted
            loop
            playsInline
            controls={false}
            aria-label={`${item.title} video`}
          />
        ) : item.youtubeId ? (
          active ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${item.youtubeId}?rel=0&modestbranding=1&autoplay=1&mute=1`}
              allow="autoplay; encrypted-media; fullscreen"
              allowFullScreen
              title={item.title}
            />
          ) : (
            <img
              src={youtubeThumbnail ?? undefined}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 to-navy-950 flex items-center justify-center">
            <span className="text-6xl" role="img" aria-label={item.track.title}>
              {item.track.icon}
            </span>
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-navy-900 to-transparent pointer-events-none" aria-hidden="true" />

        {/* Track chip top-left */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-mono text-white backdrop-blur-sm">
          <span>{item.track.icon}</span>
          <span className="truncate max-w-[120px]">{item.track.title}</span>
        </div>

        {/* View count top-right */}
        <div className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs font-mono text-white/80 backdrop-blur-sm">
          {item.viewCount >= 1000
            ? `${(item.viewCount / 1000).toFixed(1)}k`
            : item.viewCount.toString()} views
        </div>
      </div>

      {/* Metadata below the video */}
      <div className="px-4 py-3 space-y-2">
        <h2 className="text-sm font-semibold text-white leading-snug line-clamp-2">
          {item.title}
        </h2>

        <div className="flex items-center gap-2 text-xs text-navy-400">
          {item.creator.avatarUrl ? (
            <img
              src={item.creator.avatarUrl}
              alt={creatorName}
              className="h-5 w-5 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-700 text-[10px] font-bold text-white">
              {creatorName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate">{creatorName}</span>
          {item.creator.creatorProfile?.isVerified && (
            <span className="text-orange-400 shrink-0" aria-label="Verified">✓</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {displayTags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag.replace(/^#/, '').toLowerCase()}`}
              className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11px] font-mono text-navy-300 hover:bg-white/15 hover:text-white transition-colors"
            >
              #{tag.replace(/^#/, '')}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function ReelCardSkeleton() {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-navy-900 animate-pulse">
      <div className="aspect-[9/16] bg-navy-800" />
      <div className="px-4 py-3 space-y-2">
        <div className="h-3.5 w-3/4 rounded bg-navy-700" />
        <div className="h-3 w-1/2 rounded bg-navy-800" />
      </div>
    </div>
  );
}

// ─── Main feed ────────────────────────────────────────────────────────────────

export function ReelCardFeed(): React.JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['reel-cards'],
    queryFn: ({ pageParam }) =>
      getShortsFeed(typeof pageParam === 'string' ? pageParam : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  // Track which card is in view (play/pause trigger)
  const setCardRef = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) cardRefs.current.set(id, node);
    else cardRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (best) {
          const id = best.target.getAttribute('data-card-id');
          if (id) setActiveId(id);
        }
      },
      { threshold: [0.5, 0.75] },
    );

    for (const [, node] of cardRefs.current) observer.observe(node);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Infinite scroll sentinel
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <div className="min-h-screen bbt-screen">
      {/* Sticky nav bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#07071a]/80 px-4 py-3 backdrop-blur-xl">
        <Link href="/" className="font-display text-xl text-white">
          BBT LearnOS
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/tracks"
            className="hidden rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 sm:inline-flex transition-colors"
          >
            Tracks
          </Link>
          <AuthCTA />
        </nav>
      </header>

      {/* Hero tagline */}
      <div className="px-4 pt-8 pb-4 text-center">
        <p className="bbt-kicker mb-2">Skill Reels</p>
        <h1 className="font-display text-4xl text-white sm:text-5xl">
          Swipe. Learn. Get Hired.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-navy-300">
          Short verified reels from BBT creators across all 8 career tracks.
        </p>
      </div>

      {/* Feed */}
      <div className="mx-auto max-w-sm px-4 pb-16 sm:max-w-[420px]">
        {isLoading ? (
          <div className="space-y-8 pt-4">
            <ReelCardSkeleton />
            <ReelCardSkeleton />
            <ReelCardSkeleton />
          </div>
        ) : items.length === 0 ? (
          <div className="py-24 text-center">
            <p className="text-navy-400">Skill reels are being approved. Check back soon.</p>
            <Link href="/tracks" className="mt-6 inline-flex bbt-button-primary px-6 py-2.5 text-sm">
              Browse Tracks
            </Link>
          </div>
        ) : (
          <div className="space-y-8 pt-4">
            {items.map((item) => (
              <div
                key={item.id}
                ref={(node) => setCardRef(item.id, node)}
                data-card-id={item.id}
              >
                <ReelCard
                  item={item}
                  active={activeId === item.id || (activeId === null && items[0]?.id === item.id)}
                />
              </div>
            ))}

            <div ref={sentinelRef} className="h-4 flex items-center justify-center">
              {isFetchingNextPage && (
                <svg className="h-5 w-5 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
