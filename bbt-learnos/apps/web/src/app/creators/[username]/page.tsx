import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface ContentPreview {
  id: string;
  title: string;
  type: string;
  muxPlaybackId: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  duration: number | null;
  track: { title: string; slug: string };
}

interface CreatorProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  creatorProfile: {
    displayName: string;
    bio: string;
    tier: number;
    isVerified: boolean;
    qualityScore: number;
  };
  content: ContentPreview[];
}

interface Props {
  params: { username: string };
}

async function getCreator(username: string): Promise<CreatorProfile | null> {
  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiBase}/creators/${username}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<CreatorProfile>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const creator = await getCreator(params.username);
  if (!creator) return { title: 'Creator | BBT LearnOS' };

  return {
    title: `${creator.creatorProfile.displayName} — Creator`,
    description: creator.creatorProfile.bio || `${creator.creatorProfile.displayName} is a ${creator.creatorProfile.isVerified ? 'verified ' : ''}creator on BBT LearnOS.`,
    openGraph: {
      title: `${creator.creatorProfile.displayName} | BBT LearnOS`,
      description: creator.creatorProfile.bio,
      type: 'profile',
      url: `https://bbt.edu.pk/creators/${params.username}`,
    },
  };
}

const TIER_LABEL: Record<number, string> = { 1: 'Emerging', 2: 'Established', 3: 'Expert' };
const TIER_COLOR: Record<number, string> = {
  1: 'text-navy-400',
  2: 'text-indigo-400',
  3: 'text-orange-400',
};

export default async function CreatorProfilePage({ params }: Props): Promise<React.JSX.Element> {
  const creator = await getCreator(params.username);
  if (!creator) notFound();

  const { creatorProfile: profile, content } = creator;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        {/* Header */}
        <section aria-labelledby="creator-name" className="flex items-start gap-6">
          <div className="h-20 w-20 shrink-0 rounded-full bg-indigo-600 flex items-center justify-center text-white font-display text-3xl overflow-hidden">
            {creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={creator.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (
              profile.displayName.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 id="creator-name" className="font-display text-3xl text-navy-900 dark:text-white">
                {profile.displayName}
              </h1>
              {profile.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-mono text-indigo-600 dark:text-indigo-300">
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
              <span className={`text-xs font-mono ${TIER_COLOR[profile.tier] ?? 'text-navy-400'}`}>
                Tier {profile.tier} — {TIER_LABEL[profile.tier] ?? 'Creator'}
              </span>
            </div>
            {profile.bio && (
              <p className="mt-2 text-navy-500 dark:text-navy-300 max-w-2xl">{profile.bio}</p>
            )}
            <div className="mt-3 flex gap-4 text-sm font-mono text-navy-400 dark:text-navy-500">
              <span>{content.length} videos</span>
              <span>Quality score {Math.round(profile.qualityScore * 100)}%</span>
            </div>
          </div>
        </section>

        {/* Content catalogue */}
        {content.length > 0 && (
          <section aria-labelledby="content-heading">
            <h2 id="content-heading" className="font-display text-2xl text-navy-900 dark:text-white mb-6">
              Content
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {content.map((item) => (
                <article key={item.id} className="group rounded-2xl border border-navy-100 dark:border-navy-700 bg-white dark:bg-navy-800 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-navy-100 dark:bg-navy-900 relative">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-navy-300 dark:text-navy-600">
                        <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                      </div>
                    )}
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 rounded bg-navy-950/80 px-1.5 py-0.5 text-xs font-mono text-white">
                        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="text-xs font-mono text-orange-500">{item.track.title}</span>
                    <h3 className="mt-1 text-sm font-semibold text-navy-900 dark:text-white line-clamp-2 group-hover:text-orange-500 transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs font-mono text-navy-400 dark:text-navy-500">
                      {item.viewCount.toLocaleString()} views
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* JSON-LD: Person */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: profile.displayName,
            description: profile.bio,
            url: `https://bbt.edu.pk/creators/${params.username}`,
            ...(creator.avatarUrl && { image: creator.avatarUrl }),
            worksFor: { '@type': 'Organization', name: 'BBT LearnOS', url: 'https://bbt.edu.pk' },
          }),
        }}
      />
    </>
  );
}
