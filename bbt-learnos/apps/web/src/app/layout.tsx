import type { Metadata } from 'next';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://bbt.edu.pk'),
  title: {
    default: 'BBT LearnOS — The Career Operating System Pakistan Needed',
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
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <Providers>
          <main className="flex-1">{children}</main>
        </Providers>
        <footer className="border-t border-navy-100 dark:border-navy-800 py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-navy-400 dark:text-navy-500">
              <p>© {new Date().getFullYear()} Big Binary Tech. 444-Q Phase 2 DHA Lahore.</p>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-navy-700 dark:hover:text-navy-300 transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-navy-700 dark:hover:text-navy-300 transition-colors">Terms</a>
                <a href="/content-policy" className="hover:text-navy-700 dark:hover:text-navy-300 transition-colors">Content Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
