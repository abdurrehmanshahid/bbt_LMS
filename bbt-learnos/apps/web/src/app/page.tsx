import type { Metadata } from 'next';

import { CourseMarketplace } from '@/components/CourseMarketplace';
import { getShortsFeed, getTracks, type ShortFeedItem, type TrackSummary } from '@/lib/api';

export const metadata: Metadata = {
  title: 'BBT LearnOS - Career Track Marketplace',
  description:
    'Compare deep-tech career tracks, preview free lessons, start free modules, and unlock full access when you find the right path.',
};

export default async function HomePage(): Promise<React.JSX.Element> {
  let tracks: TrackSummary[] = [];
  let videos: ShortFeedItem[] = [];

  try {
    const [trackData, shortData] = await Promise.all([
      getTracks(),
      getShortsFeed(),
    ]);
    tracks = trackData;
    videos = shortData.items;
  } catch {
    // The marketplace still renders useful empty states when the API is offline.
  }

  return (
    <CourseMarketplace tracks={tracks} videos={videos} />
  );
}
