import type { Metadata } from 'next';
import Link from 'next/link';
import { getTracks } from '@/lib/api';
import type { TrackSummary } from '@/lib/api';

export const metadata: Metadata = {
  title: 'BBT LearnOS — The Career Operating System Pakistan Needed',
  description:
    'Train through 7 deep-tech tracks. Earn verifiable skill badges. Get absorbed into Big Binary Tech or placed with leading employers.',
};

const AUDIENCE_CTAS = [
  {
    role: 'Learn',
    headline: 'I want to learn',
    body: 'Master deep-tech skills through structured tracks and hands-on assessments.',
    href: '/tracks',
    cta: 'Browse Tracks',
    color: 'from-indigo-600 to-indigo-800',
  },
  {
    role: 'Teach',
    headline: 'I want to teach',
    body: 'Share your expertise. Earn revenue. Build your creator reputation on BBT.',
    href: '/auth/signup?role=creator',
    cta: 'Become a Creator',
    color: 'from-orange-500 to-orange-700',
  },
  {
    role: 'Hire',
    headline: 'I want to hire',
    body: 'Find credentialled talent. Hire a team. Verify skills with Open Badges.',
    href: 'https://talent.bigbinarytech.com',
    cta: 'Find Talent',
    color: 'from-navy-700 to-navy-900',
  },
] as const;

const SOCIAL_PROOF = [
  { value: '12,000+', label: 'Enrolled Learners' },
  { value: '94%', label: 'Avg Completion Rate' },
  { value: '47', label: 'Employer Partners' },
  { value: 'PSDA + NAVTTC', label: 'Affiliated' },
] as const;

const CREDENTIAL_LOGOS = ['PSDA', 'NAVTTC', 'Cisco'] as const;

function TrackCardStatic({ track }: { track: TrackSummary }) {
  return (
    <Link
      href={`/tracks/${track.slug}`}
      className="group flex flex-col gap-3 rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 hover:shadow-lg hover:shadow-navy-900/10 transition-shadow"
    >
      <div className="flex items-start gap-3">
        <span className="text-3xl shrink-0" role="img" aria-label={track.title}>{track.icon}</span>
        <div>
          <h3 className="font-display text-lg leading-tight text-navy-900 dark:text-white group-hover:text-orange-500 transition-colors">
            {track.title}
          </h3>
          <p className="mt-1 text-sm text-navy-500 dark:text-navy-300 line-clamp-2">{track.description}</p>
        </div>
      </div>
      <div className="flex gap-3 text-xs font-mono text-navy-400 dark:text-navy-500">
        <span>{track.enrollmentCount.toLocaleString()} learners</span>
        <span>{track._count.modules} modules</span>
      </div>
      <span className="text-sm font-medium text-orange-500 group-hover:underline mt-auto">
        Start Free →
      </span>
    </Link>
  );
}

export default async function HomePage(): Promise<React.JSX.Element> {
  let tracks: TrackSummary[] = [];
  try {
    tracks = await getTracks();
  } catch {
    // API not running during build — render empty state
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950 pt-20 pb-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-indigo-950 opacity-80" aria-hidden="true" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-800 bg-indigo-950/60 px-4 py-1.5 text-xs font-mono text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" aria-hidden="true" />
            Pakistan&apos;s first verifiable career platform
          </div>
          <h1 className="mt-4 font-display text-5xl sm:text-6xl lg:text-7xl text-white leading-none tracking-wide">
            The Career Operating<br className="hidden sm:block" /> System{' '}
            <span className="text-orange-500">Pakistan Needed</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-navy-300 font-body">
            Train through 7 deep-tech tracks. Earn verifiable skill badges. Get absorbed into Big Binary Tech or placed with leading employers.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/tracks"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-orange-500 px-8 text-base font-semibold text-white hover:bg-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Browse All 7 Tracks
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-navy-600 px-8 text-base font-semibold text-white hover:border-navy-400 transition-colors"
            >
              Start Free Today
            </Link>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="bg-navy-900 py-6 px-4" aria-label="Platform statistics">
        <div className="mx-auto max-w-7xl">
          <dl className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            {SOCIAL_PROOF.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center">
                <dt className="font-display text-2xl text-orange-400">{stat.value}</dt>
                <dd className="text-xs font-mono text-navy-400 uppercase tracking-wider mt-0.5">{stat.label}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex justify-center items-center gap-6 opacity-50">
            {CREDENTIAL_LOGOS.map((name) => (
              <span key={name} className="text-xs font-mono text-navy-300 uppercase tracking-widest">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Three-audience CTA cards */}
      <section className="py-20 px-4 bg-white dark:bg-navy-950" aria-labelledby="audience-heading">
        <div className="mx-auto max-w-7xl">
          <h2 id="audience-heading" className="sr-only">Who is BBT LearnOS for?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {AUDIENCE_CTAS.map((item) => (
              <Link
                key={item.role}
                href={item.href}
                className={`group flex flex-col gap-4 rounded-2xl bg-gradient-to-br ${item.color} p-8 text-white hover:opacity-95 transition-opacity`}
              >
                <h3 className="font-display text-3xl">{item.headline}</h3>
                <p className="text-sm opacity-80 font-body flex-1">{item.body}</p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold group-hover:gap-2 transition-all">
                  {item.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Track preview grid */}
      <section className="py-20 px-4 bg-navy-50 dark:bg-navy-900" aria-labelledby="tracks-heading">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 id="tracks-heading" className="font-display text-4xl text-navy-900 dark:text-white">
              7 Career Tracks
            </h2>
            <p className="mt-3 text-navy-500 dark:text-navy-300 max-w-xl mx-auto">
              Each track is a complete career programme — not a list of courses.
            </p>
          </div>
          {tracks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {tracks.map((track) => (
                <TrackCardStatic key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <p className="text-center text-navy-400 dark:text-navy-500">Tracks loading…</p>
          )}
          <div className="mt-10 text-center">
            <Link
              href="/tracks"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-800 px-6 text-sm font-medium text-navy-700 dark:text-navy-200 hover:border-navy-400 dark:hover:border-navy-500 transition-colors"
            >
              View all tracks →
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-white dark:bg-navy-950" aria-labelledby="pathway-heading">
        <div className="mx-auto max-w-4xl text-center">
          <h2 id="pathway-heading" className="font-display text-4xl text-navy-900 dark:text-white mb-4">
            Your Learner Pathway
          </h2>
          <p className="text-navy-500 dark:text-navy-300 mb-12">
            Every learner follows the same proven journey from zero to employed.
          </p>
          <div className="flex items-center justify-center gap-0">
            {(['Train', 'Intern', 'Shadow', 'Expert'] as const).map((phase, idx, arr) => (
              <div key={phase} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 font-display text-lg">
                    {idx + 1}
                  </div>
                  <span className="font-display text-lg text-navy-900 dark:text-white">{phase}</span>
                  <span className="text-xs text-navy-400 dark:text-navy-500 max-w-[5rem] text-center">
                    {['Learn & assess', 'Real projects', 'Work alongside experts', 'Lead & get hired'][idx]}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div className="h-0.5 w-12 sm:w-20 bg-orange-200 dark:bg-orange-900/40 mx-2 mb-10" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* JSON-LD: Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Big Binary Tech',
            url: 'https://bbt.edu.pk',
            logo: 'https://bbt.edu.pk/logo.png',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '+92-326-0188811',
              contactType: 'customer service',
            },
            address: {
              '@type': 'PostalAddress',
              streetAddress: '444-Q Phase 2 DHA',
              addressLocality: 'Lahore',
              addressCountry: 'PK',
            },
          }),
        }}
      />
    </>
  );
}
