import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { assessmentApi } from '@/lib/assessment';
import type { SkillBadge } from '@/lib/assessment';

interface Props {
  params: { username: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiBase}/learner/portfolio/${params.username}`, { next: { revalidate: 3600 } });
    if (!res.ok) return { title: 'Portfolio | BBT LearnOS' };
    const data = await res.json() as { user: { name: string }; badges: unknown[] };
    return {
      title: `${data.user.name} — Skill Portfolio`,
      description: `Verified skill badges earned by ${data.user.name} on BBT LearnOS.`,
      openGraph: {
        title: `${data.user.name} | BBT Portfolio`,
        description: `${(data.badges as unknown[]).length} verified skills`,
        type: 'profile',
        url: `https://bbt.edu.pk/portfolio/${params.username}`,
      },
    };
  } catch {
    return { title: 'Portfolio | BBT LearnOS' };
  }
}

function BadgeExpandable({ badge }: { badge: SkillBadge }): React.JSX.Element {
  const verifyBase = 'https://bbt.edu.pk/badges/verify';
  const shareUrl = `${verifyBase}/${badge.id}`;

  return (
    <article
      className="rounded-2xl border border-navy-700 bg-navy-800 p-5 hover:border-navy-500 transition-colors"
      itemScope
      itemType="https://schema.org/EducationalOccupationalCredential"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-indigo-600 flex items-center justify-center">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white" itemProp="name">{badge.conceptTitle}</h3>
          <p className="text-xs text-orange-400 font-mono mt-0.5" itemProp="educationalLevel">{badge.trackTitle}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-mono text-navy-400">
            <span>Score: <span className="text-green-400">{Math.round(badge.score)}%</span></span>
            <span itemProp="dateCreated">{new Date(badge.issuedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={badge.verificationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-mono text-navy-300 hover:border-navy-400 hover:text-white transition-colors"
          itemProp="url"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          Verify
        </a>
        <a
          href={shareUrl}
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-mono text-navy-300 hover:border-navy-400 hover:text-white transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
          Share
        </a>
        {/* QR code via external service */}
        <a
          href={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-navy-600 px-3 py-1.5 text-xs font-mono text-navy-300 hover:border-navy-400 hover:text-white transition-colors"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
          </svg>
          QR Code
        </a>
      </div>
    </article>
  );
}

export default async function PortfolioPage({ params }: Props): Promise<React.JSX.Element> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';
  let portfolio;
  try {
    const res = await fetch(`${apiBase}/learner/portfolio/${params.username}`, { next: { revalidate: 3600 } });
    if (!res.ok) notFound();
    portfolio = await res.json() as Awaited<ReturnType<typeof assessmentApi.getPortfolio>>;
  } catch {
    notFound();
  }

  const { user, badges, projects, topTrack, assessmentPercentile } = portfolio;
  const initials = user.name.slice(0, 2).toUpperCase();

  return (
    <>
      <div className="min-h-screen bg-navy-950">
        {/* Header */}
        <section className="bg-navy-900 border-b border-navy-800 px-4 py-10">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-start gap-5">
              <div className="h-16 w-16 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white font-display text-2xl overflow-hidden">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                ) : initials}
              </div>
              <div>
                <h1 className="font-display text-3xl text-white">{user.name}</h1>
                {topTrack && (
                  <p className="text-sm text-navy-400 mt-1">
                    Specialising in <span className="text-orange-400">{topTrack}</span>
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm font-mono">
                  <span className="text-white">{badges.length} <span className="text-navy-400">badges</span></span>
                  <span className="text-white">{projects.length} <span className="text-navy-400">projects</span></span>
                  {assessmentPercentile !== null && (
                    <span className="text-orange-400">Top {assessmentPercentile}%</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
          {/* Badges */}
          {badges.length > 0 && (
            <section aria-labelledby="badges-heading">
              <h2 id="badges-heading" className="font-display text-2xl text-white mb-5">
                Skill Badges
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {badges.map((badge) => (
                  <BadgeExpandable key={badge.id} badge={badge} />
                ))}
              </div>
            </section>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <section aria-labelledby="projects-heading">
              <h2 id="projects-heading" className="font-display text-2xl text-white mb-5">
                Project Showcase
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start gap-4 rounded-2xl border border-navy-700 bg-navy-800 p-5 hover:border-navy-500 transition-colors"
                  >
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-navy-700 flex items-center justify-center text-navy-400 group-hover:text-orange-400 transition-colors">
                      {p.type === 'github' ? (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate">{p.title}</h3>
                      <p className="text-xs font-mono text-orange-400 mt-0.5">{p.trackTitle}</p>
                      <p className="text-xs text-navy-500 mt-1">{new Date(p.submittedAt).toLocaleDateString()}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {badges.length === 0 && projects.length === 0 && (
            <div className="rounded-2xl border border-navy-700 bg-navy-800 p-12 text-center">
              <p className="text-navy-400">No badges or projects yet.</p>
              <Link href="/tracks" className="mt-4 inline-block text-orange-400 hover:underline text-sm">
                Start learning →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* JSON-LD: Person with hasCredential */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: user.name,
            url: `https://bbt.edu.pk/portfolio/${params.username}`,
            ...(user.avatarUrl && { image: user.avatarUrl }),
            hasCredential: badges.map((b) => ({
              '@type': 'EducationalOccupationalCredential',
              name: b.conceptTitle,
              credentialCategory: 'badge',
              recognizedBy: { '@type': 'Organization', name: 'Big Binary Tech', url: 'https://bbt.edu.pk' },
              url: b.verificationUrl,
              dateCreated: b.issuedAt,
            })),
          }),
        }}
      />
    </>
  );
}
