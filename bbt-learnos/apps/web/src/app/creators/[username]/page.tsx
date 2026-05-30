import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import React from 'react';

import { AdSlot } from '@/components/AdSlot';
import { CreatorContentGrid } from './CreatorContentGrid';
import { FollowButton } from './FollowButton';
import { TIER_LABEL, TIER_COLOR, TIER_BADGE_BG } from '@/lib/constants';

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

        {/* Content grid with tabs + track gating */}
        {creator.content.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Content</h2>
            <CreatorContentGrid content={creator.content} />
          </section>
        )}
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-8">
        <AdSlot slot="profile-bottom" className="w-full" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
