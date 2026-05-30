'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { BrandLogo } from '@/components/BrandLogo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/lib/store';
import { homeForRole } from '@/lib/utils';

const NAV_FOR_ROLE: Record<string, Array<{ href: string; label: string }>> = {
  LEARNER: [
    { href: '/dashboard', label: 'Continue Learning' },
    { href: '/tracks', label: 'My Tracks' },
    { href: '/shorts', label: 'Free Videos' },
    { href: '/jobs', label: 'Jobs' },
    { href: '/learner/portfolio', label: 'Portfolio' },
  ],
  CREATOR: [
    { href: '/creator/dashboard', label: 'Studio' },
    { href: '/creator/upload', label: 'Upload' },
    { href: '/creator/analytics', label: 'Analytics' },
    { href: '/creator/revenue', label: 'Payouts' },
  ],
  ADMIN: [
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/moderation', label: 'Moderation' },
    { href: '/admin/payouts', label: 'Payments' },
    { href: '/admin/health', label: 'Health' },
  ],
  EMPLOYER: [
    { href: '/employer/talent', label: 'Talent' },
    { href: '/jobs', label: 'Jobs' },
  ],
  FRANCHISE_OWNER: [
    { href: '/franchise/dashboard', label: 'Dashboard' },
    { href: '/tracks', label: 'Tracks' },
  ],
};

const PUBLIC_NAV = [
  { href: '/onboarding/quiz', label: 'Find My Track' },
  { href: '/shorts', label: 'Free Videos' },
  { href: '/tracks', label: 'Career Tracks' },
  { href: '/#pricing', label: 'Pricing' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/creators', label: 'For Creators' },
  { href: '/employer/hire-team', label: 'For Employers' },
];

const DROPDOWN_FOR_ROLE: Record<string, Array<{ href: string; label: string }>> = {
  LEARNER: [
    { href: '/dashboard', label: 'Continue Learning' },
    { href: '/tracks', label: 'Browse Career Tracks' },
    { href: '/shorts', label: 'Free Skill Videos' },
    { href: '/learner/portfolio', label: 'My Portfolio' },
    { href: '/account', label: 'Account Settings' },
  ],
  CREATOR: [
    { href: '/creator/dashboard', label: 'Creator Studio' },
    { href: '/creator/upload', label: 'Upload Content' },
    { href: '/creator/analytics', label: 'Analytics' },
    { href: '/creator/revenue', label: 'Payouts' },
    { href: '/account', label: 'Account Settings' },
  ],
  ADMIN: [
    { href: '/admin/health', label: 'Admin Panel' },
    { href: '/admin/courses', label: 'Courses' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/payouts', label: 'Payments' },
    { href: '/account', label: 'Account Settings' },
  ],
  EMPLOYER: [
    { href: '/employer/talent', label: 'Talent Board' },
    { href: '/account', label: 'Account Settings' },
  ],
  FRANCHISE_OWNER: [
    { href: '/franchise/dashboard', label: 'Dashboard' },
    { href: '/account', label: 'Account Settings' },
  ],
};


function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-red-800',
  CREATOR: 'bg-orange-700',
  EMPLOYER: 'bg-green-800',
  FRANCHISE_OWNER: 'bg-purple-800',
  LEARNER: 'bg-indigo-700',
};

export function Nav(): React.JSX.Element {
  const { user, accessToken, hasHydrated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAuthed = hasHydrated && !!accessToken && !!user;
  const navLinks = isAuthed ? (NAV_FOR_ROLE[user.role] ?? PUBLIC_NAV) : PUBLIC_NAV;
  const dropdownLinks = isAuthed ? (DROPDOWN_FOR_ROLE[user.role] ?? []) : [];
  const avatarBg = isAuthed ? (ROLE_COLOR[user.role] ?? 'bg-indigo-700') : 'bg-indigo-700';

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--bbt-border)] bg-[color-mix(in_srgb,var(--bbt-surface-1)_86%,transparent)] backdrop-blur-2xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-6">

          {/* Logo */}
          <div className="shrink-0">
            <BrandLogo href={isAuthed ? homeForRole(user.role) : '/'} compact priority />
          </div>

          {/* Center nav */}
          <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-mono text-xs uppercase tracking-[0.12em] text-[var(--bbt-text-3)] transition-colors hover:text-[var(--bbt-text-1)]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          {isAuthed ? (
            <div className="relative flex items-center" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                aria-expanded={open}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                <div className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center overflow-hidden border-2 border-[var(--bbt-border)] ${avatarBg}`}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-mono text-xs text-white font-semibold">{getInitials(user.name)}</span>
                  )}
                </div>
                <span className="hidden sm:block text-sm text-[var(--bbt-text-2)] max-w-[120px] truncate">
                  {user.name.split(' ')[0]}
                </span>
                <svg
                  className={`h-3.5 w-3.5 text-[var(--bbt-text-3)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-2 w-72 overflow-hidden rounded-xl border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] shadow-2xl shadow-black/20">
                  {/* User identity */}
                  <div className="flex items-center gap-3 border-b border-[var(--bbt-border)] px-4 py-3">
                    <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center overflow-hidden ${avatarBg}`}>
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-mono text-sm text-white font-semibold">{getInitials(user.name)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--bbt-text-1)] truncate">{user.name}</p>
                      <p className="text-xs text-[var(--bbt-text-3)] truncate">{user.email}</p>
                      <span className="mt-1 inline-block rounded-full bg-[var(--bbt-surface-2)] px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-[var(--bbt-text-3)]">
                        {user.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Role links */}
                  <div className="py-1">
                    {dropdownLinks.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center px-4 py-2.5 text-sm text-[var(--bbt-text-2)] hover:bg-[var(--bbt-surface-2)] hover:text-[var(--bbt-text-1)] transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-[var(--bbt-border)] py-1">
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </div>
          ) : hasHydrated ? (
            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <Link
                href="/auth/login"
                className="hidden sm:block text-sm font-semibold text-[var(--bbt-text-2)] transition-colors hover:text-[var(--bbt-text-1)]"
              >
                Log in
              </Link>
              <Link
                href="/auth/signup"
                className="bbt-button-primary h-10 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              >
                Start Free
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3" aria-label="Loading account state">
              <div className="hidden h-4 w-12 animate-pulse rounded bg-[var(--bbt-surface-2)] sm:block" />
              <div className="h-10 w-24 animate-pulse rounded-full bg-[var(--bbt-surface-2)]" />
            </div>
          )}

        </div>
      </div>
    </header>
  );
}
