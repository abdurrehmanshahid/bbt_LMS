import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ShortsReelFeed } from '@/components/ShortsReelFeed';
import { getTaggedShorts } from '@/lib/api';

interface TagPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  try {
    const feed = await getTaggedShorts(params.slug);
    return {
      title: `#${feed.tag.name} Skill Reels - BBT LearnOS`,
      description: `Short approved BBT LearnOS lessons tagged #${feed.tag.name}.`,
      alternates: { canonical: `/tags/${feed.tag.slug}` },
    };
  } catch {
    return {
      title: 'Hashtag - BBT LearnOS',
      description: 'Short approved BBT LearnOS skill reels by hashtag.',
    };
  }
}

export default async function TagPage({ params }: TagPageProps): Promise<React.JSX.Element> {
  let tagName = params.slug;
  let jsonLd: Record<string, unknown>[] = [];

  try {
    const feed = await getTaggedShorts(params.slug);
    tagName = feed.tag.name;
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
    }));
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) notFound();
  }

  return (
    <>
      <div className="sr-only">
        <h1>#{tagName} Skill Reels</h1>
      </div>
      <ShortsReelFeed tagSlug={params.slug} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
