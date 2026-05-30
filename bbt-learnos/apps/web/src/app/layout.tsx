import type { Metadata } from 'next';

import './globals.css';
import { Nav } from '@/components/Nav';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://bbt.edu.pk'),
  title: {
    default: 'BBT LearnOS - The Career Operating System Pakistan Needed',
    template: '%s | BBT LearnOS',
  },
  description:
    'Train through 7 deep-tech tracks, earn verifiable skill badges, and get absorbed into Big Binary Tech or placed with leading employers.',
  openGraph: {
    type: 'website',
    locale: 'en_PK',
    url: 'https://bbt.edu.pk',
    siteName: 'BBT LearnOS',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'BBT LearnOS' }],
  },
  twitter: { card: 'summary_large_image', site: '@bigbinarytech' },
  alternates: { canonical: '/' },
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--bbt-bg)] text-[var(--bbt-text-1)]">
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
        </Providers>
        <footer className="border-t border-[var(--bbt-border)] bg-[color-mix(in_srgb,var(--bbt-surface-1)_72%,transparent)] py-8 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 text-sm text-[var(--bbt-text-3)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p>Copyright {new Date().getFullYear()} Big Binary Tech. 444-Q Phase 2 DHA Lahore.</p>
                <p className="bbt-kicker mt-2">PSDA / NAVTTC / Cisco Networking Academy aligned training</p>
              </div>
              <div className="flex flex-wrap gap-6">
                <a href="/privacy" className="transition-colors hover:text-[var(--bbt-text-1)]">Privacy</a>
                <a href="/terms" className="transition-colors hover:text-[var(--bbt-text-1)]">Terms</a>
                <a href="/content-policy" className="transition-colors hover:text-[var(--bbt-text-1)]">Content Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
