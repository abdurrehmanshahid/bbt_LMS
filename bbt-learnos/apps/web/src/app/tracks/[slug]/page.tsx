import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTracks, getTrack } from '@/lib/api';
import type { ModuleSummary } from '@/lib/api';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  try {
    const tracks = await getTracks();
    return tracks.map((t) => ({ slug: t.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const track = await getTrack(params.slug);
    return {
      title: `${track.title} Track`,
      description: track.description,
      openGraph: {
        title: `${track.title} | BBT LearnOS`,
        description: track.description,
        type: 'website',
        url: `https://bbt.edu.pk/tracks/${track.slug}`,
      },
      alternates: {
        canonical: `/tracks/${track.slug}`,
        languages: { 'ur-PK': `/ur/tracks/${track.slug}` },
      },
    };
  } catch {
    return { title: 'Track | BBT LearnOS' };
  }
}

function ModuleRow({ module, idx, isLocked }: { module: ModuleSummary; idx: number; isLocked: boolean }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
        isLocked
          ? 'border-navy-100 dark:border-navy-800 opacity-60'
          : 'border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-800'
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-mono text-sm font-bold">
        {idx + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-body font-semibold text-navy-900 dark:text-white">{module.title}</h3>
          {isLocked && (
            <span className="shrink-0 text-xs font-mono text-navy-400 dark:text-navy-500 border border-navy-200 dark:border-navy-700 rounded px-2 py-0.5">
              Enroll to access
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-navy-500 dark:text-navy-300 line-clamp-2">{module.description}</p>
        <div className="mt-2 flex gap-3 text-xs font-mono text-navy-400 dark:text-navy-500">
          <span>{module.estimatedMinutes} min</span>
          <span>{module._count.concepts} concepts</span>
          <span>{module._count.content} videos</span>
        </div>
      </div>
    </div>
  );
}

export default async function TrackPage({ params }: Props): Promise<React.JSX.Element> {
  let track;
  try {
    track = await getTrack(params.slug);
  } catch {
    notFound();
  }

  const FREE_MODULES = 2;

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-950 pt-16 pb-20 px-4">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-2 text-sm font-mono text-navy-400 mb-4">
            <Link href="/tracks" className="hover:text-navy-200 transition-colors">Tracks</Link>
            <span aria-hidden="true">/</span>
            <span className="text-navy-200">{track.title}</span>
          </div>
          <div className="flex items-start gap-5">
            <span className="text-5xl shrink-0" role="img" aria-label={track.title}>{track.icon}</span>
            <div>
              <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">{track.title}</h1>
              <p className="mt-3 text-lg text-navy-300">{track.description}</p>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-sm font-mono text-navy-400">
            <span className="text-white">{track.enrollmentCount.toLocaleString()} <span className="text-navy-400">learners</span></span>
            <span className="text-white">{track.modules.length} <span className="text-navy-400">modules</span></span>
            <span className="text-white">{Math.round(track.avgCompletionRate * 100)}% <span className="text-navy-400">completion rate</span></span>
          </div>
          <div className="mt-8 flex gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
            >
              Start Free — {FREE_MODULES} modules unlocked
            </Link>
            <Link
              href={`/auth/signup?plan=monthly&track=${track.id}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-navy-600 px-6 text-sm font-semibold text-white hover:border-navy-400 transition-colors"
            >
              Go Full Access
            </Link>
          </div>
        </div>
      </section>

      {/* Curriculum */}
      <section className="py-16 px-4 bg-navy-50 dark:bg-navy-900" aria-labelledby="curriculum-heading">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between mb-8">
            <h2 id="curriculum-heading" className="font-display text-3xl text-navy-900 dark:text-white">
              Curriculum
            </h2>
            <span className="text-sm font-mono text-navy-400 dark:text-navy-500">
              First {FREE_MODULES} modules free
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {track.modules.map((module, idx) => (
              <ModuleRow
                key={module.id}
                module={module}
                idx={idx}
                isLocked={idx >= FREE_MODULES}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-4 bg-white dark:bg-navy-950" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-4xl">
          <h2 id="pricing-heading" className="font-display text-3xl text-navy-900 dark:text-white text-center mb-10">
            Start Free. Go Full When Ready.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-navy-200 dark:border-navy-700 bg-white dark:bg-navy-800 p-6">
              <h3 className="font-display text-xl text-navy-900 dark:text-white">Free</h3>
              <p className="mt-1 text-3xl font-display text-navy-900 dark:text-white">PKR 0</p>
              <ul className="mt-4 space-y-2 text-sm text-navy-600 dark:text-navy-300">
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> First {FREE_MODULES} modules</li>
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> Skill badge for each concept</li>
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> Cohort assignment</li>
              </ul>
              <Link
                href="/auth/signup"
                className="mt-6 block text-center rounded-lg border border-navy-200 dark:border-navy-600 py-2.5 text-sm font-semibold text-navy-700 dark:text-navy-200 hover:border-navy-400 transition-colors"
              >
                Start Free
              </Link>
            </div>
            {/* Paid */}
            <div className="rounded-2xl border-2 border-orange-500 bg-white dark:bg-navy-800 p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-500 px-3 py-0.5 text-xs font-mono font-bold text-white">
                RECOMMENDED
              </span>
              <h3 className="font-display text-xl text-navy-900 dark:text-white">Full Access</h3>
              <p className="mt-1 text-3xl font-display text-navy-900 dark:text-white">PKR 2,999<span className="text-base font-body text-navy-400">/mo</span></p>
              <ul className="mt-4 space-y-2 text-sm text-navy-600 dark:text-navy-300">
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> All {track.modules.length} modules</li>
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> Portfolio + absorption eligibility</li>
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> Offline downloads</li>
                <li className="flex gap-2"><span className="text-green-500" aria-hidden="true">✓</span> Priority job matching</li>
              </ul>
              <Link
                href={`/auth/signup?plan=monthly&track=${track.id}`}
                className="mt-6 block text-center rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Go Full Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* JSON-LD: Course */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: track.title,
            description: track.description,
            provider: {
              '@type': 'Organization',
              name: 'Big Binary Tech',
              url: 'https://bbt.edu.pk',
            },
            url: `https://bbt.edu.pk/tracks/${track.slug}`,
            numberOfCredits: track.modules.length,
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'online',
              courseWorkload: `PT${track.modules.reduce((s, m) => s + m.estimatedMinutes, 0)}M`,
            },
          }),
        }}
      />
    </>
  );
}
