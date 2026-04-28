import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bbt.edu.pk';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Track { slug: string; updatedAt: string }
interface Creator { creatorProfile: { displayName: string } | null; updatedAt: string }

async function fetchTracks(): Promise<Track[]> {
  try {
    const res = await fetch(`${API}/tracks`, { next: { revalidate: 3600 } });
    return res.ok ? (res.json() as Promise<Track[]>) : [];
  } catch { return []; }
}

async function fetchCreators(): Promise<Creator[]> {
  try {
    const res = await fetch(`${API}/social/creators/public-list`, { next: { revalidate: 3600 } });
    return res.ok ? (res.json() as Promise<Creator[]>) : [];
  } catch { return []; }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tracks, creators] = await Promise.all([fetchTracks(), fetchCreators()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/tracks`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/leaderboard`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE}/jobs`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.2 },
  ];

  const trackRoutes: MetadataRoute.Sitemap = tracks.map((t) => ({
    url: `${BASE}/tracks/${t.slug}`,
    lastModified: new Date(t.updatedAt),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const creatorRoutes: MetadataRoute.Sitemap = creators
    .filter((c) => c.creatorProfile?.displayName)
    .map((c) => ({
      url: `${BASE}/creators/${c.creatorProfile!.displayName}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

  return [...staticRoutes, ...trackRoutes, ...creatorRoutes];
}
