import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FollowButton } from './FollowButton';

interface ContentPreview {
  id: string;
  title: string;
  type: string;
  muxPlaybackId: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  duration: number | null;
  createdAt: string;
  track: { title: string; slug: string; icon: string };
  _count: { comments: number; reactions: number };
}

interface CreatorData {
  id: string;
  name: string;
  avatarUrl: string | null;
  creatorProfile: {
    displayName: string;
    bio: string;
    tier: number;
    isVerified: boolean;
    qualityScore: number;
  } | null;
  content: ContentPreview[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
}

interface Props {
  params: { username: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function getCreator(username: string): Promise<CreatorData | null> {
  try {
    const res = await fetch(`${API}/creators/${username}/profile`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<CreatorData>;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const creator = await getCreator(params.username);
  if (!creator?.creatorProfile) return { title: 'Creator | BBT LearnOS' };

  const p = creator.creatorProfile;
  const desc = p.bio || `${p.displayName} is a ${p.isVerified ? 'verified ' : ''}creator on BBT LearnOS.`;

  return {
    title: `${p.displayName} — ${TIER_LABEL[p.tier] ?? 'Creator'}`,
    description: desc,
    openGraph: {
      title: `${p.displayName} | BBT LearnOS`,
      description: desc,
      type: 'profile',
      url: `https://bbt.edu.pk/creators/${params.username}`,
      ...(creator.avatarUrl ? { images: [{ url: creator.avatarUrl, width: 400, height: 400 }] } : {}),
    },
    twitter: { card: 'summary', title: p.displayName, description: desc },
  };
}

const TIER_LABEL: Record<number, string> = { 1: 'Emerging', 2: 'Verified', 3: 'Expert Mentor' };
const TIER_COLOR: Record<number, string> = {
  1: 'text-slate-400',
  2: 'text-blue-400',
  3: 'text-[#F7941D]',
};
const TIER_BADGE_BG: Record<number, string> = {
  1: 'bg-slate-700',
  2: 'bg-blue-500/20',
  3: 'bg-[#F7941D]/20',
};

export default async function CreatorProfilePage({ params }: Props): Promise<React.JSX.Element> {
  const creator = await getCreator(params.username);
  if (!creator?.creatorProfile) notFound();

  const p = creator.creatorProfile;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: p.displayName,
    description: p.bio,
    url: `https://bbt.edu.pk/creators/${params.username}`,
    ...(creator.avatarUrl ? { image: creator.avatarUrl } : {}),
    jobTitle: `${TIER_LABEL[p.tier] ?? 'Creator'} on BBT LearnOS`,
    worksFor: { '@type': 'Organization', name: 'BBT LearnOS', url: 'https://bbt.edu.pk' },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: creator.followerCount,
    },
  };

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-12 space-y-12">
        {/* Hero header */}
        <section className="flex flex-col sm:flex-row items-start gap-6">
          <div className="h-24 w-24 shrink-0 rounded-full bg-[#2E3192] flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
            {creator.avatarUrl
              ? <img src={creator.avatarUrl} alt={p.displayName} className="h-full w-full object-cover" />
              : p.displayName.slice(0, 2).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{p.displayName}</h1>
              {p.isVerified && (
                <span className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs text-blue-300">
                  ✓ Verified
                </span>
              )}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TIER_BADGE_BG[p.tier]} ${TIER_COLOR[p.tier]}`}>
                Tier {p.tier} · {TIER_LABEL[p.tier]}
              </span>
            </div>

            {p.bio && <p className="mt-2 text-slate-400 max-w-2xl">{p.bio}</p>}

            <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
              <span className="text-white font-semibold">
                {creator.followerCount.toLocaleString()} <span className="text-slate-400 font-normal">followers</span>
              </span>
              <span className="text-white font-semibold">
                {creator.content.length} <span className="text-slate-400 font-normal">videos</span>
              </span>
              <span className="text-white font-semibold">
                {Math.round(p.qualityScore * 100)}% <span className="text-slate-400 font-normal">quality score</span>
              </span>
            </div>
          </div>

          {/* Follow button — client island */}
          <FollowButton creatorId={creator.id} initialFollowing={creator.isFollowing} />
        </section>

        {/* Content grid */}
        {creator.content.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Content</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {creator.content.map((item) => (
                <article
                  key={item.id}
                  className="group rounded-xl border border-slate-700 bg-slate-900 overflow-hidden hover:border-[#F7941D]/50 transition-colors"
                >
                  <div className="aspect-video bg-slate-800 relative">
                    {item.thumbnailUrl
                      ? <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full object-cover" />
                      : <div className="flex h-full items-center justify-center text-slate-600 text-4xl">▶</div>}
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                        {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-[#F7941D]">{item.track.icon} {item.track.title}</p>
                    <h3 className="mt-1 text-sm font-semibold text-white line-clamp-2 group-hover:text-[#F7941D] transition-colors">
                      {item.title}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                      <span>{item.viewCount.toLocaleString()} views</span>
                      <span>💬 {item._count.comments}</span>
                      <span>⚡ {item._count.reactions}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
