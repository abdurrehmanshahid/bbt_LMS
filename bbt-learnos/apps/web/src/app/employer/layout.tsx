'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect } from 'react';

import { useAuthStore } from '@/lib/store';

const NAV = [
  {
    href: '/employer/talent',
    label: 'Find Talent',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    href: '/employer/post-job',
    label: 'Post a Job',
    icon: 'M12 4v16m8-8H4',
  },
  {
    href: '/employer/staff-aug',
    label: 'Staff Aug',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    href: '/employer/hire-team',
    label: 'Hire a Team',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  },
];

export default function EmployerLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user && user.role !== 'EMPLOYER') {
      router.replace('/dashboard');
    } else if (!user) {
      router.replace('/auth/login');
    }
  }, [user, router]);

  if (!user || user.role !== 'EMPLOYER') return <div className="min-h-screen" />;

  return (
    <div className="flex min-h-screen bbt-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 bbt-sidebar">
        <div className="px-6 py-5 border-b border-[var(--bbt-border)]">
          <span className="text-sm font-semibold text-[#F7941D] tracking-wide uppercase">
            talent.bigbinarytech.com
          </span>
          <p className="text-xs bbt-muted mt-0.5">Employer Portal</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active ? 'bbt-chip-active font-medium' : 'bbt-nav-pill'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-[var(--bbt-border)] text-xs bbt-muted">
          {user.name}
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-10 bbt-sidebar flex items-center gap-2 px-4 py-3 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap text-xs px-3 py-1.5 rounded-full ${
              pathname.startsWith(item.href)
                ? 'bbt-chip-active'
                : 'bbt-nav-pill border border-[var(--bbt-border)]'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <main className="flex-1 lg:ml-60 pt-16 lg:pt-0 px-6 py-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
