import type { Metadata } from 'next';
import Link from 'next/link';

import { ApplyCreatorCTA } from './ApplyCreatorCTA';
import { TIER_LABEL, TIER_BORDER_COLOR } from '@/lib/constants';

export const metadata: Metadata = {
  title: 'Creators — BBT LearnOS',
  description: 'Learn from verified experts — engineers, designers, and practitioners from Pakistan\'s deep-tech ecosystem.',
};

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface CreatorListItem {
  id: string;
  name: string;
  avatarUrl: string | null;
  updatedAt: string;
  creatorProfile: {
    displayName: string;
    bio: string;
    tier: number;
    isVerified: boolean;
    qualityScore: number;
  } | null;
  _count?: { content: number; followers: number };
}

async function getCreators(): Promise<CreatorListItem[]> {
  try {
    const res = await fetch(`${API}/social/creators/public-list`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    return res.json() as Promise<CreatorListItem[]>;
  } catch {
    return [];
  }
}

const TIER_COLOR = TIER_BORDER_COLOR;

function CreatorCard({ creator }: { creator: CreatorListItem }) {
  const profile = creator.creatorProfile;
  if (!profile) return null;
  const tier = profile.tier ?? 1;
  const initials = creator.name.slice(0, 2).toUpperCase();
  return (
    <Link
      href={`/creators/${profile.displayName}`}
      className="group flex flex-col rounded-2xl border border-white/10 bg-navy-900 p-5 transition-all hover:border-orange-500/30 hover:bg-navy-800"
    >
      <div className="flex items-start gap-4 mb-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-indigo-700 flex items-center justify-center text-lg font-mono font-bold text-white overflow-hidden">
          {creator.avatarUrl ? (
            <img src={creator.avatarUrl} alt={creator.name} className="h-full w-full object-cover" />
          ) : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white group-hover:text-orange-400 transition-colors truncate">
              {profile.displayName}
            </span>
            {profile.isVerified && (
              <span className="shrink-0 text-orange-400" title="Verified creator" aria-label="Verified">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
          <span className={`inline-block mt-1 rounded border px-2 py-0.5 text-xs font-mono ${TIER_COLOR[tier] ?? TIER_COLOR[1]}`}>
            {TIER_LABEL[tier] ?? 'Creator'}
          </span>
        </div>
      </div>
      {profile.bio && (
        <p className="text-sm text-navy-300 line-clamp-2 leading-relaxed">{profile.bio}</p>
      )}
      {creator._count && (
        <div className="mt-4 flex gap-5 text-xs font-mono text-navy-500 pt-4 border-t border-navy-700">
          <span>{creator._count.content.toLocaleString()} lessons</span>
          <span>{creator._count.followers.toLocaleString()} followers</span>
        </div>
      )}
    </Link>
  );
}

export default async function CreatorsPage(): Promise<React.JSX.Element> {
  const creators = await getCreators();
  const verified = creators.filter((c) => c.creatorProfile?.isVerified);
  const others = creators.filter((c) => !c.creatorProfile?.isVerified && c.creatorProfile);

  return (
    <div className="min-h-screen bbt-screen">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#07071a]/80 px-4 py-14 text-center backdrop-blur-xl">
        <p className="bbt-kicker mb-4">Verified Creators</p>
        <h1 className="font-display text-5xl text-white sm:text-6xl">
          Learn from the<br />
          <span className="text-orange-400">practitioners.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-navy-300">
          Every BBT creator is vetted, scored, and tiered. No fluff — only professionals who have shipped real products.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {creators.length === 0 ? (
          <div className="bbt-card p-16 text-center">
            <p className="font-display text-3xl text-white mb-3">Creators are being onboarded</p>
            <p className="text-sm text-navy-400">BBT&apos;s first cohort of verified creators is completing their onboarding. Come back soon.</p>
            <ApplyCreatorCTA className="mt-6 bbt-button-primary inline-flex px-5 py-2.5 text-sm" />
          </div>
        ) : (
          <>
            {verified.length > 0 && (
              <section className="mb-12">
                <h2 className="font-display text-2xl text-white mb-6 flex items-center gap-3">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.492 4.492 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                  Verified Creators
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {verified.map((c) => <CreatorCard key={c.id} creator={c} />)}
                </div>
              </section>
            )}

            {others.length > 0 && (
              <section>
                <h2 className="font-display text-2xl text-white mb-6">All Creators</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {others.map((c) => <CreatorCard key={c.id} creator={c} />)}
                </div>
              </section>
            )}
          </>
        )}

        {/* Become a creator CTA */}
        <div className="mt-16 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-10 text-center">
          <h2 className="font-display text-3xl text-white mb-3">Are you an expert?</h2>
          <p className="text-sm text-navy-300 mb-6 max-w-md mx-auto">
            Apply to become a BBT creator. Earn revenue share, build your reputation, and help Pakistan&apos;s next tech generation.
          </p>
          <ApplyCreatorCTA />
        </div>
      </div>
    </div>
  );
}
