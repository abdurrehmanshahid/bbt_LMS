import * as React from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '/tracks', label: 'Tracks' },
  { href: '/creators', label: 'Creators' },
  { href: '/jobs', label: 'Jobs' },
];

export function Nav(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 dark:border-navy-800 bg-white/90 dark:bg-navy-950/90 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="BBT LearnOS home">
            <span className="font-display text-2xl text-orange-500 tracking-wider">BBT</span>
            <span className="hidden sm:block font-mono text-xs text-navy-400 dark:text-navy-500 uppercase tracking-widest pt-1">
              LearnOS
            </span>
          </Link>

          {/* Nav links */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-body font-medium text-navy-600 dark:text-navy-300 hover:text-navy-900 dark:hover:text-white transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="hidden sm:block text-sm font-medium text-navy-600 dark:text-navy-300 hover:text-navy-900 dark:hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex h-9 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-medium text-white hover:bg-orange-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              Start Free
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
