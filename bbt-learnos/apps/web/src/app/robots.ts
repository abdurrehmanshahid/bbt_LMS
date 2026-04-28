import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bbt.edu.pk';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tracks/', '/creators/', '/leaderboard', '/jobs'],
        disallow: [
          '/admin/',
          '/creator/',
          '/learner/',
          '/employer/',
          '/auth/',
          '/onboarding',
          '/live/',
          '/lti/',
          '/api/',
        ],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
