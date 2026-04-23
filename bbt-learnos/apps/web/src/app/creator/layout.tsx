'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

const NAV = [
  { href: '/creator/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/creator/upload', label: 'Upload', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
  { href: '/creator/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/creator/moderation-inbox', label: 'Moderation', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
  { href: '/creator/revenue', label: 'Revenue', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  useEffect(() => {
    if (!accessToken) router.push('/auth/login?returnUrl=/creator/dashboard');
    else if (user && user.role !== 'CREATOR' && user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [accessToken, user, router]);

  if (!accessToken) return <></>;

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-navy-800 bg-navy-900 px-4 py-6">
        <div className="mb-6 px-2">
          <p className="text-xs font-mono text-navy-500 uppercase tracking-wider">Creator Studio</p>
          {user && (
            <p className="mt-1 text-sm font-semibold text-white truncate">{user.name}</p>
          )}
        </div>
        <nav className="flex flex-col gap-1" aria-label="Creator navigation">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-navy-400 hover:bg-navy-800 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-xs font-mono text-navy-500 hover:text-navy-300 transition-colors"
          >
            ← Learner view
          </Link>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-16 left-0 right-0 z-30 bg-navy-900 border-b border-navy-800 px-4 overflow-x-auto">
        <div className="flex gap-1 py-2">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                  active ? 'bg-orange-500 text-white' : 'text-navy-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 min-w-0 lg:pt-0 pt-12">{children}</main>
    </div>
  );
}
