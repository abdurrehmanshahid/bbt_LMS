import type { Metadata } from 'next';

import { ShortsReelFeed } from '@/components/ShortsReelFeed';
import { getShortsFeed } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Skill Shorts - BBT LearnOS',
  description: 'SEO-indexed short video lessons from approved BBT LearnOS creators.',
};

export default async function ShortsPage(): Promise<React.JSX.Element> {
  let jsonLd: Record<string, unknown>[] = [];

  try {
    const feed = await getShortsFeed();
    jsonLd = feed.items.map((item) => ({
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: item.title,
      description: item.description,
      thumbnailUrl: item.thumbnailUrl ? [item.thumbnailUrl] : undefined,
      uploadDate: item.createdAt,
      duration: item.duration ? `PT${item.duration}S` : undefined,
      contentUrl: item.muxPlaybackId ? `https://stream.mux.com/${item.muxPlaybackId}.m3u8` : undefined,
      genre: item.track.title,
      keywords: item.tags.join(', '),
      creator: {
        '@type': 'Person',
        name: item.creator.creatorProfile?.displayName ?? item.creator.name,
      },
    }));
  } catch {
    jsonLd = [];
  }

  return (
    <>
      <ShortsReelFeed />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
