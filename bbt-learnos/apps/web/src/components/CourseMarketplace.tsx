'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { TrackEnrollCTA } from '@/components/TrackEnrollCTA';
import type { ShortFeedItem, TrackSummary } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

// ─── Constants ───────────────────────────────────────────────────────────────

const FREE_VIEW_LIMIT = 3;
const FREE_VIEW_KEY = 'bbt-free-views';
const FREE_VIEW_DISMISSED_KEY = 'bbt-free-views-dismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

type MarketplaceFilter =
  | 'recommended'
  | 'popular-tracks'
  | 'popular-full-access'
  | 'free-to-start'
  | 'cheapest-access'
  | 'most-watched-videos'
  | 'job-ready-paths';

type ContentTab = 'videos' | 'articles';

const FILTERS: Array<{ id: MarketplaceFilter; label: string }> = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'popular-tracks', label: 'Popular tracks' },
  { id: 'popular-full-access', label: 'Popular full-access' },
  { id: 'free-to-start', label: 'Free to start' },
  { id: 'cheapest-access', label: 'Cheapest access' },
  { id: 'most-watched-videos', label: 'Most watched videos' },
  { id: 'job-ready-paths', label: 'Job-ready paths' },
];

const OUTCOMES: Record<number, string> = {
  1: 'Build LLM agents, RAG systems, and AI automations',
  2: 'Ship ML pipelines, model evaluations, and cloud AI services',
  3: 'Customise Odoo for Pakistan / MENA enterprise clients',
  4: 'Launch production full-stack AI apps from scratch',
  5: 'Protect apps, networks, and systems with security practice',
  6: 'Design products, brands, and UX from concept to handoff',
  7: 'Drive growth with AI marketing, Shopify, and sales automation',
  8: 'Build enterprise networks and earn CCNA certification',
};

const ARTICLE_TITLES: Record<number, string> = {
  1: 'How to Build Production AI Agents with LangGraph & AutoGen',
  2: 'The Complete MLOps Roadmap: Docker → Kubernetes → SageMaker',
  3: 'Building Custom Odoo Modules: A Practical ERP Developer Guide',
  4: 'Full-Stack AI Apps with Next.js 15, NestJS & pgvector',
  5: 'Cybersecurity Learning Path: HTB → CPTS → SOC Analyst',
  6: 'UI/UX Design System Mastery: Figma Tokens to Code Handoff',
  7: 'AI Marketing Playbook: Meta Ads, Shopify & Clay Outbound',
  8: 'CCNA Study Guide: TCP/IP, OSPF, BGP & Network Automation',
};

const JOB_READY_TRACKS = new Set([1, 2, 3, 4, 5]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCompact(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toLocaleString();
}

function getVideoImage(item: ShortFeedItem): string | null {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  if (item.youtubeId) return `https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`;
  return null;
}

function sortTracks(tracks: TrackSummary[], filter: MarketplaceFilter): TrackSummary[] {
  const ordered = [...tracks];
  if (filter === 'popular-tracks' || filter === 'popular-full-access') {
    return ordered.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
  }
  if (filter === 'cheapest-access') {
    return ordered.sort((a, b) => a._count.modules - b._count.modules || b.enrollmentCount - a.enrollmentCount);
  }
  if (filter === 'job-ready-paths') {
    return ordered.filter((t) => JOB_READY_TRACKS.has(t.trackNumber)).sort((a, b) => a.trackNumber - b.trackNumber);
  }
  return ordered.sort((a, b) => a.trackNumber - b.trackNumber);
}

function readFreeViews(): number {
  try { return parseInt(localStorage.getItem(FREE_VIEW_KEY) ?? '0', 10) || 0; }
  catch { return 0; }
}

function isDismissed(): boolean {
  try {
    const ts = parseInt(localStorage.getItem(FREE_VIEW_DISMISSED_KEY) ?? '0', 10);
    return Date.now() - ts < DISMISS_TTL_MS;
  } catch { return false; }
}

// ─── Free-View Gate Modal ─────────────────────────────────────────────────────

function FreeViewModal({ onDismiss }: { onDismiss: () => void }): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gate-heading"
    >
      {/* Blurred backdrop */}
      <div className="absolute inset-0 backdrop-blur-md bg-[var(--bbt-bg)]/75" aria-hidden="true" />

      <div className="relative w-full max-w-md rounded-2xl border border-[var(--bbt-border-strong)] bg-[var(--bbt-surface-1)] p-8 shadow-2xl text-center">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-[var(--bbt-text-3)] hover:bg-[var(--bbt-surface-3)] hover:text-[var(--bbt-text-1)] transition-colors"
          aria-label="Dismiss"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
          🔒
        </div>

        <h2 id="gate-heading" className="text-2xl font-bold text-[var(--bbt-text-1)]">
          You&apos;ve used {FREE_VIEW_LIMIT} free previews
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--bbt-text-2)]">
          Create a free account to keep watching and unlock 2 full modules per track. No credit card needed.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="bbt-button-primary h-11 px-6 text-sm"
          >
            Create free account
          </Link>
          <Link
            href="/auth/login"
            className="bbt-button-secondary h-11 px-6 text-sm"
          >
            Sign in
          </Link>
        </div>

        <p className="mt-4 text-xs text-[var(--bbt-text-3)]">Dismiss to continue browsing for 24 hours</p>
      </div>
    </div>
  );
}

// ─── Track card ───────────────────────────────────────────────────────────────

function TrackMarketplaceCard({ track }: { track: TrackSummary }): React.JSX.Element {
  return (
    <article className="bbt-card group flex min-h-[360px] flex-col p-5 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bbt-surface-3)] text-3xl">
          <span role="img" aria-label={track.title}>{track.icon}</span>
        </div>
        <span className="font-mono text-xs text-[var(--bbt-text-3)]">#{String(track.trackNumber).padStart(2, '0')}</span>
      </div>

      <div className="mt-5 flex-1">
        <Link href={`/tracks/${track.slug}`} className="group/title">
          <h2 className="text-2xl leading-none text-[var(--bbt-text-1)] transition-colors group-hover/title:text-orange-500">
            {track.title}
          </h2>
        </Link>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--bbt-text-2)]">
          {track.description}
        </p>
        <p className="mt-4 text-sm font-semibold text-[var(--bbt-text-1)]">
          {OUTCOMES[track.trackNumber] ?? 'Build a practical portfolio and move toward paid work'}
        </p>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] p-2">
          <dt className="font-mono uppercase tracking-wider text-[var(--bbt-text-3)]">Modules</dt>
          <dd className="mt-1 font-semibold text-[var(--bbt-text-1)]">{track._count.modules}</dd>
        </div>
        <div className="rounded-xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] p-2">
          <dt className="font-mono uppercase tracking-wider text-[var(--bbt-text-3)]">Learners</dt>
          <dd className="mt-1 font-semibold text-[var(--bbt-text-1)]">{formatCompact(track.enrollmentCount)}</dd>
        </div>
        <div className="rounded-xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] p-2">
          <dt className="font-mono uppercase tracking-wider text-[var(--bbt-text-3)]">Start</dt>
          <dd className="mt-1 font-semibold text-orange-500">Free</dd>
        </div>
      </dl>

      <TrackEnrollCTA trackId={track.id} trackSlug={track.slug} freeModuleCount={2} compact />
    </article>
  );
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoPreviewCard({
  item,
  onView,
}: {
  item: ShortFeedItem;
  onView: () => void;
}): React.JSX.Element {
  const image = getVideoImage(item);
  const creatorName = item.creator.creatorProfile?.displayName ?? item.creator.name;

  return (
    <Link
      href="/shorts"
      onClick={onView}
      className="group block overflow-hidden rounded-2xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] shadow-sm transition-transform duration-200 hover:-translate-y-1"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-[var(--bbt-surface-3)]">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">
            <span role="img" aria-label={item.track.title}>{item.track.icon}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 text-white">
          <p className="line-clamp-2 text-sm font-semibold">{item.title}</p>
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <div className="flex items-center justify-between gap-2 text-xs font-mono text-[var(--bbt-text-3)]">
          <span className="truncate">{creatorName}</span>
          <span>{formatCompact(item.viewCount)} views</span>
        </div>
        <p className="line-clamp-1 text-xs text-orange-500">{item.track.title}</p>
      </div>
    </Link>
  );
}

// ─── Article card ─────────────────────────────────────────────────────────────

function ArticleCard({
  track,
  onView,
}: {
  track: TrackSummary;
  onView: () => void;
}): React.JSX.Element {
  const readMinutes = Math.ceil(track._count.modules * 4);
  const excerpt = track.description.length > 120 ? `${track.description.slice(0, 120)}…` : track.description;
  const title = ARTICLE_TITLES[track.trackNumber] ?? `Complete Guide to ${track.title}`;

  return (
    <article className="bbt-card flex flex-col gap-4 p-6 transition-transform duration-200 hover:-translate-y-1">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--bbt-surface-3)] text-xl">
          {track.icon}
        </span>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full bg-[var(--bbt-surface-3)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--bbt-text-3)]">
            {track.title}
          </span>
          <span className="rounded-full bg-[var(--bbt-surface-3)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--bbt-text-3)]">
            {readMinutes} min read
          </span>
        </div>
      </div>

      <div className="flex-1">
        <Link href={`/tracks/${track.slug}`} onClick={onView} className="group/title">
          <h3 className="text-lg font-bold leading-snug text-[var(--bbt-text-1)] transition-colors group-hover/title:text-orange-500">
            {title}
          </h3>
        </Link>
        <p className="mt-2 text-sm leading-6 text-[var(--bbt-text-2)]">{excerpt}</p>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[var(--bbt-text-3)]">
          {track._count.modules} modules · Free to start
        </span>
        <Link
          href={`/tracks/${track.slug}`}
          onClick={onView}
          className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          Read the guide →
        </Link>
      </div>
    </article>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CourseMarketplace({
  tracks,
  videos,
}: {
  tracks: TrackSummary[];
  videos: ShortFeedItem[];
}): React.JSX.Element {
  const { accessToken } = useAuthStore();

  // Marketplace filter state
  const [activeFilter, setActiveFilter] = useState<MarketplaceFilter>('recommended');

  // Content tab state
  const [contentTab, setContentTab] = useState<ContentTab>('videos');

  // Video track filter state
  const [videoTrackFilter, setVideoTrackFilter] = useState<string | null>(null);

  // Free-view gate state
  const [gateOpen, setGateOpen] = useState(false);
  const freeViewsRef = useRef(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    freeViewsRef.current = readFreeViews();
    setHydrated(true);
  }, []);

  function recordView(): void {
    if (accessToken) return; // logged-in users bypass gate
    if (isDismissed()) return;
    freeViewsRef.current += 1;
    try { localStorage.setItem(FREE_VIEW_KEY, String(freeViewsRef.current)); } catch { /* noop */ }
    if (freeViewsRef.current >= FREE_VIEW_LIMIT) setGateOpen(true);
  }

  function dismissGate(): void {
    setGateOpen(false);
    freeViewsRef.current = 0;
    try {
      localStorage.setItem(FREE_VIEW_KEY, '0');
      localStorage.setItem(FREE_VIEW_DISMISSED_KEY, String(Date.now()));
    } catch { /* noop */ }
  }

  // Derived data
  const visibleTracks = useMemo(
    () => sortTracks(tracks, activeFilter).slice(0, activeFilter === 'job-ready-paths' ? 5 : 8),
    [activeFilter, tracks],
  );

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => b.viewCount - a.viewCount),
    [videos],
  );

  const trackFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    return sortedVideos.filter((v) => {
      if (seen.has(v.track.slug)) return false;
      seen.add(v.track.slug);
      return true;
    });
  }, [sortedVideos]);

  const filteredVideos = useMemo(() => {
    const base = activeFilter === 'most-watched-videos' ? sortedVideos.slice(0, 8) : sortedVideos.slice(0, 4);
    return videoTrackFilter ? sortedVideos.filter((v) => v.track.slug === videoTrackFilter) : base;
  }, [activeFilter, sortedVideos, videoTrackFilter]);

  const totalLearners = tracks.reduce((sum, t) => sum + t.enrollmentCount, 0);
  const totalModules = tracks.reduce((sum, t) => sum + t._count.modules, 0);

  return (
    <div className="bbt-screen min-h-screen">

      {/* ── Gate modal ─────────────────────────────────────────────────────── */}
      {hydrated && gateOpen && <FreeViewModal onDismiss={dismissGate} />}

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:pt-16">
        <div className="flex flex-col justify-center">
          <p className="bbt-kicker">Course marketplace</p>
          <h1 className="mt-4 text-5xl leading-none text-[var(--bbt-text-1)] sm:text-7xl">
            Pick a career track. Start free. Get job-ready.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--bbt-text-2)]">
            BBT LearnOS turns deep-tech courses into a guided path: short previews, structured modules, verified creators, portfolio work, and employer-facing outcomes.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/onboarding/quiz" className="bbt-button-primary h-12 px-6 text-sm">
              Find my track
            </Link>
            <Link href="/tracks" className="bbt-button-secondary h-12 px-6 text-sm">
              Browse all tracks
            </Link>
            <Link href="/shorts" className="bbt-button-secondary h-12 px-6 text-sm">
              Watch free videos
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-2">
          {[
            ['Career tracks', tracks.length.toLocaleString()],
            ['Modules ready', totalModules.toLocaleString()],
            ['Learners enrolled', formatCompact(totalLearners)],
            ['Free starter modules', '2 / track'],
          ].map(([label, value]) => (
            <div key={label} className="bbt-panel p-5">
              <p className="font-mono text-xs uppercase tracking-wider text-[var(--bbt-text-3)]">{label}</p>
              <p className="mt-3 text-4xl font-bold text-[var(--bbt-text-1)]">{value}</p>
            </div>
          ))}
          <div className="bbt-panel p-5 sm:col-span-3 lg:col-span-2" id="pricing">
            <p className="bbt-kicker">Pricing</p>
            <p className="mt-2 text-2xl font-bold text-[var(--bbt-text-1)]">Start free, unlock full access when the track is right.</p>
            <p className="mt-2 text-sm leading-6 text-[var(--bbt-text-2)]">
              Every track exposes starter modules before payment. Full-access pricing is shown at enrollment so learners can compare value after seeing the course quality.
            </p>
          </div>
        </div>
      </section>

      {/* ── Track filter bar ─────────────────────────────────────────────────── */}
      <section className="sticky top-16 z-20 border-y border-[var(--bbt-border)] bg-[color-mix(in_srgb,var(--bbt-surface-1)_86%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={`bbt-chip shrink-0 px-4 py-2 transition-colors ${
                activeFilter === filter.id ? 'bbt-chip-active' : 'hover:border-orange-500/40 hover:text-[var(--bbt-text-1)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Track grid ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="bbt-kicker">Tracks</p>
            <h2 className="mt-2 text-4xl leading-none text-[var(--bbt-text-1)]">Choose the path with the clearest next step</h2>
          </div>
          <Link href="/tracks" className="text-sm font-semibold text-orange-500 hover:text-orange-600">
            View all tracks
          </Link>
        </div>

        {visibleTracks.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {visibleTracks.map((track) => (
              <TrackMarketplaceCard key={track.id} track={track} />
            ))}
          </div>
        ) : (
          <div className="bbt-card mt-6 p-10 text-center text-[var(--bbt-text-2)]">
            Track data is unavailable. Start the API to load the marketplace.
          </div>
        )}
      </section>

      {/* ── Content section: Videos + Articles tabs ──────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* Section header + tab switcher */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="bbt-kicker">Free content</p>
            <h2 className="mt-2 text-4xl leading-none text-[var(--bbt-text-1)]">Learn before you commit</h2>
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-2)] p-1">
            {(['videos', 'articles'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setContentTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                  contentTab === tab
                    ? 'bg-[var(--bbt-surface-1)] text-[var(--bbt-text-1)] shadow-sm'
                    : 'text-[var(--bbt-text-3)] hover:text-[var(--bbt-text-2)]'
                }`}
              >
                {tab === 'videos' ? '▶ Videos' : '📄 Articles'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Videos tab ────────────────────────────────────────────────────── */}
        {contentTab === 'videos' && (
          <div className="mt-6">
            {/* Track filter chips */}
            {trackFilterOptions.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setVideoTrackFilter(null)}
                  className={`bbt-chip px-3 py-1.5 text-xs transition-colors ${!videoTrackFilter ? 'bbt-chip-active' : 'hover:border-orange-500/40'}`}
                >
                  All tracks
                </button>
                {trackFilterOptions.map((v) => (
                  <button
                    key={v.track.slug}
                    type="button"
                    onClick={() => setVideoTrackFilter(videoTrackFilter === v.track.slug ? null : v.track.slug)}
                    className={`bbt-chip flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${
                      videoTrackFilter === v.track.slug ? 'bbt-chip-active' : 'hover:border-orange-500/40'
                    }`}
                  >
                    <span>{v.track.icon}</span>
                    <span className="truncate max-w-[100px]">{v.track.title}</span>
                  </button>
                ))}
              </div>
            )}

            {filteredVideos.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                  {filteredVideos.map((item) => (
                    <VideoPreviewCard key={item.id} item={item} onView={recordView} />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link href="/shorts" className="bbt-button-secondary h-10 px-6 text-sm">
                    Watch all videos →
                  </Link>
                </div>
              </>
            ) : (
              <div className="bbt-card mt-2 p-10 text-center text-[var(--bbt-text-2)]">
                Video previews are being approved. Browse tracks while the feed warms up.
              </div>
            )}
          </div>
        )}

        {/* ── Articles tab ──────────────────────────────────────────────────── */}
        {contentTab === 'articles' && (
          <div className="mt-6">
            {tracks.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {tracks
                  .sort((a, b) => a.trackNumber - b.trackNumber)
                  .map((track) => (
                    <ArticleCard key={track.id} track={track} onView={recordView} />
                  ))}
              </div>
            ) : (
              <div className="bbt-card mt-2 p-10 text-center text-[var(--bbt-text-2)]">
                Articles are being prepared. Check back soon.
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
