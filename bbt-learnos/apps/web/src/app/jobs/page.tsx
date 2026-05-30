import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Job Opportunities',
  description: 'Browse full-time, freelance, and remote opportunities from BBT employer partners. Filter by track, location, and type.',
  openGraph: {
    title: 'Jobs & Opportunities | BBT LearnOS',
    description: 'Find employer-posted roles matched to your verified BBT skill badges.',
    type: 'website',
    url: 'https://bbt.edu.pk/jobs',
  },
  alternates: { canonical: '/jobs' },
};

type JobType = 'full-time' | 'freelance' | 'remote';

interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  type: JobType;
  track: string;
  trackSlug: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  postedAt: string;
  badgeRequired: string | null;
  remote: boolean;
  description: string;
  applyUrl: string;
}

interface JobsResponse {
  jobs: JobListing[];
  total: number;
  tracks: Array<{ slug: string; title: string }>;
}

interface Props {
  searchParams: { track?: string; type?: string };
}

async function getJobs(params: { track?: string; type?: string }): Promise<JobsResponse> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';
  const qs = new URLSearchParams({ approved: 'true' });
  if (params.track) qs.set('track', params.track);
  if (params.type) qs.set('type', params.type);

  try {
    const res = await fetch(`${apiBase}/employer/opportunities?${qs.toString()}`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) throw new Error('API error');
    type ApiOpp = {
      id: string; title: string; track: string; location: string; isRemote: boolean;
      type: string; salaryMin: number | null; salaryMax: number | null; currency: string;
      createdAt: string; employer: { name: string };
    };
    const opps = await res.json() as ApiOpp[];
    const jobs: JobListing[] = opps.map((o) => ({
      id: o.id,
      title: o.title,
      company: o.employer.name,
      location: o.location,
      type: (o.type as JobType) ?? 'full-time',
      track: o.track,
      trackSlug: o.track.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      salaryMin: o.salaryMin,
      salaryMax: o.salaryMax,
      currency: o.currency,
      postedAt: o.createdAt,
      badgeRequired: null,
      remote: o.isRemote,
      description: '',
      applyUrl: '#',
    }));
    return { jobs, total: jobs.length, tracks: [] };
  } catch {
    return { jobs: [], total: 0, tracks: [] };
  }
}

const TYPE_LABEL: Record<JobType, string> = {
  'full-time': 'Full-time',
  freelance: 'Freelance',
  remote: 'Remote',
};

const TYPE_COLOR: Record<JobType, string> = {
  'full-time': 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  freelance: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  remote: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
};

function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (!min && !max) return 'Competitive';
  const fmt = (n: number) =>
    currency === 'PKR'
      ? `PKR ${(n / 1000).toFixed(0)}k`
      : `$${(n / 1000).toFixed(0)}k`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function JobCard({ job }: { job: JobListing }) {
  const initials = job.company.slice(0, 2).toUpperCase();

  return (
    <article
      className="group flex flex-col sm:flex-row gap-4 rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-800 p-5 hover:shadow-lg hover:shadow-navy-900/10 transition-shadow"
      itemScope
      itemType="https://schema.org/JobPosting"
    >
      {/* Company logo placeholder */}
      <div className="h-12 w-12 shrink-0 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-mono text-sm font-bold">
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold text-navy-900 dark:text-white group-hover:text-orange-500 transition-colors" itemProp="title">
              {job.title}
            </h2>
            <p className="text-sm text-navy-500 dark:text-navy-300" itemProp="hiringOrganization" itemScope itemType="https://schema.org/Organization">
              <span itemProp="name">{job.company}</span>
              {job.location && <> · <span itemProp="address">{job.location}</span></>}
            </p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-mono ${TYPE_COLOR[job.type]}`}>
            {TYPE_LABEL[job.type]}
          </span>
        </div>

        <p className="mt-2 text-sm text-navy-500 dark:text-navy-300 line-clamp-2" itemProp="description">
          {job.description}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-navy-400 dark:text-navy-500">
            {formatSalary(job.salaryMin, job.salaryMax, job.currency)}
          </span>
          <span className="text-xs font-mono text-orange-500">
            {job.track}
          </span>
          {job.badgeRequired && (
            <span className="inline-flex items-center gap-1 text-xs font-mono text-indigo-500 dark:text-indigo-400">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 1a9 9 0 100 18A9 9 0 0010 1zm3.707 7.293a1 1 0 00-1.414-1.414L9 10.172 7.707 8.879a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Badge: {job.badgeRequired}
            </span>
          )}
          <span className="ml-auto text-xs font-mono text-navy-400 dark:text-navy-500" itemProp="datePosted" content={job.postedAt}>
            {timeAgo(job.postedAt)}
          </span>
        </div>
      </div>

      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:pl-2 sm:border-l sm:border-navy-100 sm:dark:border-navy-700">
        <Link
          href={`/jobs/${job.id}`}
          className="text-xs font-mono text-navy-400 hover:text-navy-700 dark:hover:text-navy-200 transition-colors whitespace-nowrap"
        >
          View details →
        </Link>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 transition-colors whitespace-nowrap"
        >
          Apply Now
        </a>
      </div>
    </article>
  );
}

const EMPTY_TRACKS = [
  { slug: 'genai-agentic-ai', title: 'GenAI + Agentic AI' },
  { slug: 'cloud-mlops', title: 'Cloud + MLOps' },
  { slug: 'odoo-erp', title: 'Odoo ERP Development' },
  { slug: 'ai-full-stack', title: 'AI-Integrated Full Stack' },
  { slug: 'cybersecurity', title: 'Cybersecurity' },
  { slug: 'ui-ux-design', title: 'UI/UX + Brand Design' },
  { slug: 'ai-marketing', title: 'AI Marketing + Sales' },
];

export default async function JobsPage({ searchParams }: Props): Promise<React.JSX.Element> {
  const data = await getJobs(searchParams);
  const tracks = data.tracks.length > 0 ? data.tracks : EMPTY_TRACKS;

  const activeTrack = searchParams.track ?? '';
  const activeType = searchParams.type ?? '';

  function buildUrl(overrides: Record<string, string>): string {
    const p = new URLSearchParams();
    if (activeTrack) p.set('track', activeTrack);
    if (activeType) p.set('type', activeType);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) p.set(k, v);
      else p.delete(k);
    });
    const s = p.toString();
    return s ? `/jobs?${s}` : '/jobs';
  }

  const jobPostings = data.jobs.map((job) => ({
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    employmentType: job.type === 'full-time' ? 'FULL_TIME' : job.type === 'freelance' ? 'CONTRACTOR' : 'TELECOMMUTE',
    hiringOrganization: { '@type': 'Organization', name: job.company },
    jobLocation: job.remote
      ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressCountry: 'PK' } }
      : { '@type': 'Place', address: job.location },
    applicantLocationRequirements: job.remote ? { '@type': 'Country', name: 'Pakistan' } : undefined,
    ...(job.salaryMin && {
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: job.currency,
        value: { '@type': 'QuantitativeValue', minValue: job.salaryMin, maxValue: job.salaryMax, unitText: 'MONTH' },
      },
    }),
    url: `https://bbt.edu.pk/jobs/${job.id}`,
  }));

  return (
    <div className="min-h-screen bbt-screen">
      {/* Hero */}
      <section className="bg-navy-950 pt-14 pb-16 px-4">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-mono text-orange-500 mb-2 uppercase tracking-wider">Opportunity Board</p>
          <h1 className="font-display text-4xl sm:text-5xl text-white leading-tight">
            Jobs Matched to Your<br className="hidden sm:block" />{' '}
            <span className="text-orange-500">Verified Skills</span>
          </h1>
          <p className="mt-4 text-navy-300 max-w-xl">
            Every listing below is from a vetted BBT employer partner. Roles marked with a badge icon require a verified BBT skill credential.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-mono text-navy-400">{data.total} open roles</span>
            {(activeTrack || activeType) && (
              <Link href="/jobs" className="text-xs font-mono text-orange-400 hover:text-orange-300 transition-colors">
                Clear filters ×
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          {/* Track filter */}
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildUrl({ track: '' })}
              className={`rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                !activeTrack
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-navy-200 dark:border-navy-700 text-navy-500 dark:text-navy-400 hover:border-navy-400'
              }`}
            >
              All Tracks
            </Link>
            {tracks.map((t) => (
              <Link
                key={t.slug}
                href={buildUrl({ track: t.slug })}
                className={`rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                  activeTrack === t.slug
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-navy-200 dark:border-navy-700 text-navy-500 dark:text-navy-400 hover:border-navy-400'
                }`}
              >
                {t.title}
              </Link>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex gap-2 ml-auto">
            {(['full-time', 'freelance', 'remote'] as const).map((t) => (
              <Link
                key={t}
                href={buildUrl({ type: activeType === t ? '' : t })}
                className={`rounded-full border px-3 py-1.5 text-xs font-mono transition-colors ${
                  activeType === t
                    ? 'border-indigo-500 bg-indigo-500 text-white'
                    : 'border-navy-200 dark:border-navy-700 text-navy-500 dark:text-navy-400 hover:border-navy-400'
                }`}
              >
                {TYPE_LABEL[t]}
              </Link>
            ))}
          </div>
        </div>

        {/* Listings */}
        {data.jobs.length > 0 ? (
          <div className="flex flex-col gap-4">
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-800 p-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-navy-100 dark:bg-navy-700 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-navy-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <p className="font-display text-lg text-navy-900 dark:text-white mb-1">No roles match those filters</p>
            <p className="text-sm text-navy-500 dark:text-navy-400 mb-6">Try clearing a filter or check back — new listings are added weekly.</p>
            <Link href="/jobs" className="text-sm font-semibold text-orange-500 hover:underline">
              View all opportunities →
            </Link>
          </div>
        )}

        {/* Post a role CTA */}
        <div className="mt-12 rounded-2xl bg-gradient-to-br from-navy-800 to-navy-950 border border-navy-700 p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <h2 className="font-display text-2xl text-white">Hiring BBT-credentialled talent?</h2>
            <p className="mt-1 text-sm text-navy-300">
              Post a role and reach learners who have earned verified skill badges in your required track.
            </p>
          </div>
          <a
            href="mailto:hire@bigbinarytech.com?subject=Post%20a%20Job%20on%20BBT%20LearnOS"
            className="shrink-0 inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Post a Role →
          </a>
        </div>
      </div>

      {/* JSON-LD: ItemList of JobPostings */}
      {jobPostings.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'BBT LearnOS Job Opportunities',
              url: 'https://bbt.edu.pk/jobs',
              itemListElement: jobPostings.map((jp, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: jp,
              })),
            }),
          }}
        />
      )}
    </div>
  );
}
