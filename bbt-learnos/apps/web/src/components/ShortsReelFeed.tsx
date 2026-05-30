'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getShortsFeed, getTaggedShorts, trackReelEvent, type ShortFeedItem } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { homeForRole } from '@/lib/utils';

function AuthCTA(): React.JSX.Element {
  const { user, accessToken, hasHydrated } = useAuthStore();
  if (!hasHydrated) {
    return <span className="h-9 w-24 animate-pulse rounded-full bg-white/10" aria-label="Loading account state" />;
  }
  if (accessToken && user) {
    return (
      <Link href={homeForRole(user.role)} className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
        Go to Dashboard
      </Link>
    );
  }
  return (
    <Link href="/auth/signup" className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
      Start Free
    </Link>
  );
}

function getMuxUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

function CreatorName({ item }: { item: ShortFeedItem }) {
  return (
    <span>
      {item.creator.creatorProfile?.displayName ?? item.creator.name}
      {item.creator.creatorProfile?.isVerified ? <span className="ml-1 text-orange-400" aria-label="Verified creator">V</span> : null}
    </span>
  );
}

function ReelSlide({
  item,
  active,
  muted,
  onToggleMuted,
  setVideoRef,
}: {
  item: ShortFeedItem;
  active: boolean;
  muted: boolean;
  onToggleMuted: () => void;
  setVideoRef: (id: string, node: HTMLVideoElement | null) => void;
}) {
  const displayTags = item.tags.length > 0 ? item.tags : [item.track.slug];
  const youtubeThumbnail = item.youtubeId ? `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg` : null;
  const hasVisual = Boolean(item.muxPlaybackId || item.youtubeId || item.thumbnailUrl);

  useEffect(() => {
    if (active) void trackReelEvent(item.id, 'reel_view').catch(() => undefined);
  }, [active, item.id]);

  return (
    <article className="relative h-dvh snap-start overflow-hidden bg-navy-950 text-white" aria-label={item.title}>
      {item.muxPlaybackId ? (
        <video
          ref={(node) => setVideoRef(item.id, node)}
          className="absolute inset-0 h-full w-full object-cover"
          poster={item.thumbnailUrl ?? undefined}
          src={getMuxUrl(item.muxPlaybackId)}
          muted={muted}
          loop
          playsInline
          controls={false}
          onClick={onToggleMuted}
          onEnded={() => void trackReelEvent(item.id, 'reel_complete').catch(() => undefined)}
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
        <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 overflow-hidden bg-[#07071a]" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(247,148,29,0.34),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(46,49,146,0.42),transparent_34%),linear-gradient(135deg,#07071a_0%,#0d0d2e_48%,#171741_100%)]" />
          <div className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-orange-400/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-1/3 h-px bg-gradient-to-r from-transparent via-indigo-300/35 to-transparent" />
          <div className="absolute right-[-8rem] top-[-8rem] h-80 w-80 rounded-full border border-orange-400/20" />
          <div className="absolute bottom-[-10rem] left-[-8rem] h-96 w-96 rounded-full border border-indigo-300/20" />
          <div className="absolute right-10 top-28 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 font-mono text-xs leading-6 text-orange-200/80 shadow-2xl shadow-black/35 sm:right-20">
            <p>01001011 10110010</p>
            <p>RAG.CLOUD.CODE</p>
            <p>11100010 00110101</p>
          </div>
        </div>
      )}

      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          hasVisual
            ? 'from-navy-950 via-navy-950/15 to-navy-950/30'
            : 'from-navy-950/82 via-navy-950/28 to-transparent'
        }`}
        aria-hidden="true"
      />

      {!hasVisual ? (
        <div className="absolute left-4 right-4 top-[42%] z-[1] -translate-y-1/2 sm:left-8 sm:right-20 lg:left-auto lg:right-32 lg:w-[520px]">
          <div className="rounded-3xl border border-white/12 bg-white/[0.07] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <span className="text-6xl" role="img" aria-label={item.track.title}>{item.track.icon}</span>
              <div className="rounded-full border border-orange-300/30 bg-orange-500/15 px-4 py-2 font-mono text-xs text-orange-100">
                Skill Reel
              </div>
            </div>
            <div className="bbt-progress mb-5">
              <div className="bbt-progress-fill w-2/3" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-orange-200">{item.track.title}</p>
            <p className="mt-3 font-display text-4xl leading-none text-white sm:text-5xl">{item.title}</p>
            <p className="mt-4 text-sm leading-6 text-white/72">{item.description}</p>
            <Link
              href={`/tracks/${item.track.slug}`}
              className="bbt-button-primary mt-6 h-11 px-5 text-sm"
            >
              Open Track
            </Link>
          </div>
        </div>
      ) : null}

      <div className={`absolute left-4 right-20 z-[1] sm:left-8 sm:right-28 ${
        hasVisual ? 'bottom-24 sm:bottom-16' : 'bottom-10 sm:bottom-10'
      }`}>
        <div className="mb-3 flex items-center gap-2 text-sm font-mono text-orange-300">
          <span>{item.track.icon}</span>
          <Link href={`/tracks/${item.track.slug}`} className="hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
            {item.track.title}
          </Link>
        </div>
        <h2 className={`font-display leading-none text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)] ${
          hasVisual ? 'text-4xl sm:text-6xl' : 'text-2xl sm:text-3xl'
        }`}>{item.title}</h2>
        {hasVisual ? <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">{item.description}</p> : null}
        <p className="mt-4 text-sm font-semibold text-white">
          <CreatorName item={item} />
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {displayTags.slice(0, 4).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag.replace(/^#/, '').toLowerCase()}`}
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-mono text-white backdrop-blur hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              #{tag.replace(/^#/, '')}
            </Link>
          ))}
        </div>
      </div>

      <div className="absolute right-4 bottom-24 z-[1] flex flex-col items-center gap-3 sm:right-8 sm:bottom-16">
        <button
          type="button"
          onClick={onToggleMuted}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label={muted ? 'Unmute reel' : 'Mute reel'}
        >
          {muted ? (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
        <div className="rounded-full bg-white/15 px-2 py-3 text-center text-xs font-mono text-white backdrop-blur">
          <span className="block">{item.viewCount.toLocaleString()}</span>
          <span className="text-navy-200">views</span>
        </div>
        <button
          type="button"
          onClick={() => void trackReelEvent(item.id, 'reel_share').catch(() => undefined)}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          aria-label="Share reel"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </article>
  );
}

export function ShortsReelFeed({ variant = 'shorts', tagSlug }: { variant?: 'home' | 'shorts'; tagSlug?: string }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef(new Map<string, HTMLVideoElement>());

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['public-shorts-feed', tagSlug ?? 'all'],
    queryFn: ({ pageParam }) =>
      tagSlug
        ? getTaggedShorts(tagSlug, typeof pageParam === 'string' ? pageParam : undefined)
        : getShortsFeed(typeof pageParam === 'string' ? pageParam : undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const items = data?.pages.flatMap((page) => page.items) ?? [];
  const pinnedChallenge = data?.pages[0]?.pinnedChallenge ?? null;
  const firstItemId = items[0]?.id ?? null;

  const setVideoRef = useCallback((id: string, node: HTMLVideoElement | null) => {
    if (node) videoRefs.current.set(id, node);
    else videoRefs.current.delete(id);
  }, []);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute('data-reel-id');
        if (id) setActiveId(id);
      },
      { root, threshold: [0.65, 0.85] },
    );

    root.querySelectorAll<HTMLElement>('[data-reel-id]').forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [items.length]);

  useEffect(() => {
    const targetId = activeId ?? firstItemId;
    for (const [id, node] of videoRefs.current) {
      if (id === targetId) void node.play().catch(() => undefined);
      else node.pause();
    }
  }, [activeId, firstItemId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      event.preventDefault();
      const root = viewportRef.current;
      if (!root) return;
      root.scrollBy({ top: event.key === 'ArrowDown' ? window.innerHeight : -window.innerHeight, behavior: 'smooth' });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const root = viewportRef.current;
    if (!root) return;
    const onScroll = () => {
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - root.clientHeight && hasNextPage && !isFetchingNextPage) {
        void fetchNextPage();
      }
    };
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => root.removeEventListener('scroll', onScroll);
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (isLoading) {
    return (
      <main className="relative h-dvh overflow-hidden bg-[#07071a]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(247,148,29,0.3),transparent_26%),radial-gradient(circle_at_82%_20%,rgba(46,49,146,0.42),transparent_34%),linear-gradient(135deg,#07071a_0%,#0d0d2e_48%,#171741_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/82 via-navy-950/24 to-transparent" />
        <div className="absolute left-4 top-20 z-10 max-w-xs sm:left-8">
          <p className="font-display text-5xl leading-none text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)] sm:text-7xl">
            Swipe. Learn. Get Hired.
          </p>
          <p className="mt-3 text-sm leading-6 text-white/85">
            Loading verified skill reels and track previews.
          </p>
          <div className="bbt-progress mt-6 w-64">
            <div className="bbt-progress-fill w-3/4" />
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-dvh items-center justify-center bg-navy-950 px-6 text-center">
        <div>
          <p className="font-display text-4xl text-white">Shorts are being approved</p>
          <p className="mt-3 text-sm text-navy-300">Come back soon for verified skill reels from BBT creators.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="relative h-dvh overflow-hidden bg-navy-950">
      <div ref={viewportRef} className="h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth" aria-label="Skill reels">
        {items.map((item, index) => (
          <div key={item.id} data-reel-id={item.id}>
            <ReelSlide
              item={item}
              active={activeId === item.id || (activeId === null && index === 0)}
              muted={muted}
              onToggleMuted={() => setMuted((value) => !value)}
              setVideoRef={setVideoRef}
            />
          </div>
        ))}
      </div>

      {pinnedChallenge && !tagSlug ? (
        <Link
          href={`/tags/${pinnedChallenge.tag.slug}`}
          className="absolute left-4 right-4 top-20 z-10 rounded-lg border border-orange-400/40 bg-navy-950/70 px-4 py-3 text-white backdrop-blur sm:left-8 sm:right-auto sm:max-w-sm"
        >
          <p className="text-xs font-mono uppercase tracking-wider text-orange-300">Challenge</p>
          <p className="mt-1 text-sm font-semibold">{pinnedChallenge.title}</p>
          <p className="mt-1 text-xs text-navy-200">#{pinnedChallenge.tag.name}</p>
        </Link>
      ) : null}

      {variant !== 'home' ? (
      <header className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <Link href="/" className="pointer-events-auto font-display text-2xl text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
          BBT LearnOS
        </Link>
        <nav className="pointer-events-auto flex items-center gap-2" aria-label="Primary">
          <Link href="/tracks" className="hidden rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 sm:inline-flex">
            Tracks
          </Link>
          <AuthCTA />
        </nav>
      </header>
      ) : null}

      {variant === 'home' ? (
        <div className="pointer-events-none absolute left-4 top-20 z-10 max-w-xs sm:left-8">
          <p className="font-display text-5xl leading-none text-white sm:text-7xl">Swipe. Learn. Get Hired.</p>
          <p className="mt-3 text-sm leading-6 text-navy-100">Short skill reels, verified badges, and a path into real BBT projects.</p>
        </div>
      ) : null}
    </main>
  );
}
