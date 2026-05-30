'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { assessmentApi } from '@/lib/assessment';
import { useAuthStore } from '@/lib/store';

const ABSORPTION_STATUS_LABEL: Record<string, string> = {
  INELIGIBLE: 'Not yet eligible',
  ELIGIBLE: 'Eligible for review',
  UNDER_REVIEW: 'Under review',
  ABSORBED: 'Absorbed',
  REFERRED: 'Referred to partner',
};

const ABSORPTION_STATUS_COLOR: Record<string, string> = {
  INELIGIBLE: 'text-navy-400',
  ELIGIBLE: 'text-green-400',
  UNDER_REVIEW: 'text-yellow-400',
  ABSORBED: 'text-orange-400',
  REFERRED: 'text-indigo-400',
};

export default function MyPortfolioPage(): React.JSX.Element {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) router.push('/auth/login?returnUrl=/learner/portfolio');
  }, [accessToken, router]);

  const { data: portfolio, isLoading } = useQuery({
    queryKey: ['my-portfolio'],
    queryFn: () => assessmentApi.getMyPortfolio(accessToken!),
    enabled: !!accessToken,
  });

  if (!accessToken) return <></>;

  return (
    <div className="min-h-screen bbt-screen">
      {/* Header */}
      <div className="bg-navy-900 border-b border-navy-800 px-4 py-6">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <h1 className="font-display text-2xl text-white">My Portfolio</h1>
          {user && (
            <Link
              href={`/portfolio/${user.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-lg border border-navy-600 px-3 py-2 text-xs font-mono text-navy-300 hover:border-navy-400 hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
              Public view
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-navy-800 h-28 animate-pulse" />
          ))}
        </div>
      ) : portfolio ? (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">

          {/* Badges */}
          <section aria-labelledby="my-badges-heading">
            <div className="flex items-center justify-between mb-5">
              <h2 id="my-badges-heading" className="font-display text-xl text-white">
                Skill Badges ({portfolio.badges.length})
              </h2>
            </div>
            {portfolio.badges.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {portfolio.badges.map((badge) => (
                  <div key={badge.id} className="rounded-2xl border border-navy-700 bg-navy-800 p-5">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-400 to-indigo-600 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.491 4.491 0 01-3.497-1.307 4.491 4.491 0 01-1.307-3.497A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.491 4.491 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-sm">{badge.conceptTitle}</h3>
                        <p className="text-xs font-mono text-orange-400">{badge.trackTitle}</p>
                        <p className="text-xs text-navy-400 mt-1">
                          {Math.round(badge.score)}% · {new Date(badge.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <a
                        href={badge.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        Verify →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-8 text-center">
                <p className="text-navy-400 text-sm">Complete module assessments to earn your first badge.</p>
                <Link href="/dashboard" className="mt-4 inline-block text-orange-400 hover:underline text-sm">
                  Go to dashboard →
                </Link>
              </div>
            )}
          </section>

          {/* Absorption eligibility — private to learner only */}
          {portfolio.absorptionScore !== null && portfolio.absorptionStatus && (
            <section aria-labelledby="absorption-heading">
              <h2 id="absorption-heading" className="font-display text-xl text-white mb-5">
                Absorption Eligibility
              </h2>
              <div className="rounded-2xl border border-navy-700 bg-navy-800 p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`font-semibold ${ABSORPTION_STATUS_COLOR[portfolio.absorptionStatus] ?? 'text-white'}`}>
                      {ABSORPTION_STATUS_LABEL[portfolio.absorptionStatus] ?? portfolio.absorptionStatus}
                    </p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      Eligibility score: <span className="text-white">{portfolio.absorptionScore}/100</span>
                    </p>
                  </div>
                  <div
                    className="h-14 w-14 rounded-full border-4 border-orange-500/30 flex items-center justify-center"
                    role="img"
                    aria-label={`${portfolio.absorptionScore} out of 100`}
                  >
                    <span className="font-display text-lg text-white">{portfolio.absorptionScore}</span>
                  </div>
                </div>

                {portfolio.absorptionBreakdown && (
                  <div className="space-y-2">
                    {[
                      { label: 'Skill badges', value: portfolio.absorptionBreakdown.badges, weight: 40 },
                      { label: 'Projects', value: portfolio.absorptionBreakdown.projects, weight: 30 },
                      { label: 'Assessments', value: portfolio.absorptionBreakdown.assessments, weight: 20 },
                      { label: 'Cohort participation', value: portfolio.absorptionBreakdown.cohort, weight: 10 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs font-mono text-navy-400 mb-1">
                          <span>{item.label}</span>
                          <span>{item.value}/{item.weight}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-orange-500"
                            style={{ width: `${(item.value / item.weight) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {portfolio.absorptionStatus === 'ELIGIBLE' && (
                  <button
                    type="button"
                    className="w-full rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Apply for BBT Consideration →
                  </button>
                )}
              </div>
            </section>
          )}

        </div>
      ) : null}
    </div>
  );
}
