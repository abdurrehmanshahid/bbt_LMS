import type { Metadata } from 'next';
import Link from 'next/link';

import { TrackEnrollCTA } from '@/components/TrackEnrollCTA';
import { getTracks, type TrackSummary } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Career Tracks — BBT LearnOS',
  description: 'Choose from 8 deep-tech career tracks. Train, intern, shadow, and get absorbed into Big Binary Tech or partner employers.',
};

const TRACK_GRADIENTS: Record<number, string> = {
  1: 'from-purple-600/20 to-indigo-600/20',
  2: 'from-blue-600/20 to-cyan-600/20',
  3: 'from-orange-600/20 to-yellow-600/20',
  4: 'from-green-600/20 to-teal-600/20',
  5: 'from-red-600/20 to-orange-600/20',
  6: 'from-pink-600/20 to-purple-600/20',
  7: 'from-yellow-600/20 to-orange-600/20',
  8: 'from-cyan-600/20 to-blue-600/20',
};

function TrackCard({ track }: { track: TrackSummary }) {
  const gradient = TRACK_GRADIENTS[track.trackNumber] ?? 'from-navy-700/20 to-navy-600/20';
  return (
    <div className={`group relative rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} bg-navy-900 p-6 flex flex-col transition-all hover:border-orange-500/30 hover:shadow-[0_0_30px_rgba(247,148,29,0.08)]`}>
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <span className="text-4xl" role="img" aria-label={track.title}>{track.icon}</span>
        <span className="font-mono text-xs text-navy-500">#{String(track.trackNumber).padStart(2, '0')}</span>
      </div>

      {/* Title + description */}
      <Link href={`/tracks/${track.slug}`} className="mb-1 group/link">
        <h2 className="font-display text-xl text-white group-hover/link:text-orange-400 transition-colors leading-tight">
          {track.title}
        </h2>
      </Link>
      <p className="mb-5 text-sm text-navy-300 leading-relaxed line-clamp-2 flex-1">{track.description}</p>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs font-mono text-navy-500 mb-4">
        <span>{track._count.modules} modules</span>
        <span>{track.enrollmentCount.toLocaleString()} enrolled</span>
      </div>

      {/* Enrollment CTA — client component, handles auth state */}
      <TrackEnrollCTA trackId={track.id} trackSlug={track.slug} freeModuleCount={2} compact />
    </div>
  );
}

export default async function TracksPage(): Promise<React.JSX.Element> {
  let tracks: TrackSummary[] = [];
  try {
    tracks = await getTracks();
  } catch {
    // API offline during build
  }

  return (
    <div className="min-h-screen bbt-screen">
      {/* Hero */}
      <div className="border-b border-white/10 bg-[#07071a]/80 px-4 py-16 text-center backdrop-blur-xl">
        <p className="bbt-kicker mb-4">8 Career Tracks</p>
        <h1 className="font-display text-5xl text-white sm:text-7xl">
          Pick your path.<br />
          <span className="text-orange-400">Get absorbed.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-navy-300">
          Each track is a complete career operating system — not a course.
          Train → Intern → Shadow → Expert → Placed.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/onboarding/quiz"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Find my track →
          </Link>
          <Link
            href="/skills"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-navy-600 px-6 text-sm font-mono text-navy-300 hover:border-navy-400 hover:text-white transition-colors"
          >
            Browse by skill
          </Link>
        </div>
      </div>

      {/* Pathway */}
      <div className="border-b border-white/10 bg-navy-950/50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <ol className="flex items-center justify-center gap-0">
            {['Train', 'Intern', 'Shadow', 'Expert', 'Placed'].map((step, i) => (
              <li key={step} className="flex items-center gap-0">
                <span className="px-4 py-2 font-mono text-xs uppercase tracking-widest text-white/50 first:text-orange-400">
                  {step}
                </span>
                {i < 4 && (
                  <svg className="h-3 w-3 text-navy-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Track grid */}
      <div className="mx-auto max-w-7xl px-4 py-12">
        {tracks.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tracks
              .sort((a, b) => a.trackNumber - b.trackNumber)
              .map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-white/10 bg-navy-900/50 p-6 flex flex-col animate-pulse">
                <div className="mb-4 flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-navy-700" />
                  <div className="h-3 w-8 rounded bg-navy-700" />
                </div>
                <div className="mb-2 h-5 w-3/4 rounded bg-navy-700" />
                <div className="h-3 w-full rounded bg-navy-800 mb-1 flex-1" />
                <div className="h-3 w-2/3 rounded bg-navy-800" />
                <div className="mt-5 h-8 w-full rounded-lg bg-navy-700" />
              </div>
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-10 text-center">
          <h2 className="font-display text-3xl text-white mb-3">Not sure which track?</h2>
          <p className="text-sm text-navy-300 mb-6 max-w-md mx-auto">
            Take our 2-minute quiz and we&apos;ll match you to the right career path based on your background and goals.
          </p>
          <Link href="/onboarding/quiz" className="bbt-button-primary inline-flex px-6 py-3 text-sm">
            Take the Quiz →
          </Link>
        </div>
      </div>
    </div>
  );
}
