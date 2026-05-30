'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/lib/store';

const NAV = [
  {
    href: '/admin/health',
    label: 'Health',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    href: '/admin/moderation',
    label: 'Moderation',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  },
  {
    href: '/admin/courses',
    label: 'Courses',
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  },
  {
    href: '/admin/creators/tier-review',
    label: 'Tier Review',
    icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
  },
  {
    href: '/admin/gaps',
    label: 'Content Gaps',
    icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  },
  {
    href: '/admin/challenges',
    label: 'Challenges',
    icon: 'M7 8h10M7 12h6m-6 4h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  },
  {
    href: '/admin/franchises',
    label: 'Franchises',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bbt-screen flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bbt-sidebar backdrop-blur-2xl">
        <div className="border-b border-[var(--bbt-border)] px-5 py-5">
          <p className="bbt-kicker">Admin</p>
          <p className="mt-1 font-display text-2xl tracking-wide bbt-title">BBT LearnOS</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] bbt-muted">Control Room</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bbt-chip-active text-orange-300'
                    : 'bbt-nav-pill'
                }`}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--bbt-border)] p-3">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] bbt-muted transition-colors hover:text-[var(--bbt-text-1)]">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to platform
          </Link>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="fixed left-0 right-0 top-16 z-40 border-b bbt-sidebar px-4 py-2 backdrop-blur-2xl lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-mono uppercase tracking-[0.08em] transition-colors ${
                  active ? 'bbt-chip-active' : 'bbt-nav-pill'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 lg:pt-0 pt-12 min-w-0">
        {children}
      </main>
    </div>
  );
}
