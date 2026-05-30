'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/lib/store';

export function AccountActions(): React.JSX.Element {
  const router = useRouter();
  const { user, accessToken, hasHydrated, clearAuth } = useAuthStore();
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    try {
      await fetch(`${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api'}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
    } catch {
      // Logout is best effort; local auth state is still cleared.
    }
    clearAuth();
    router.replace('/auth/login');
  }

  if (!hasHydrated) {
    return <div className="bbt-card h-40 animate-pulse" aria-label="Loading account" />;
  }

  if (!user || !accessToken) {
    return (
      <div className="bbt-card p-6">
        <h1 className="text-3xl text-[var(--bbt-text-1)]">Account</h1>
        <p className="mt-3 text-sm text-[var(--bbt-text-2)]">Sign in to manage your account, theme, and sessions.</p>
        <Link href="/auth/login" className="bbt-button-primary mt-5 h-11 px-5 text-sm">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="bbt-card p-6">
        <p className="bbt-kicker">Account</p>
        <h1 className="mt-2 text-4xl text-[var(--bbt-text-1)]">{user.name}</h1>
        <p className="mt-2 text-sm text-[var(--bbt-text-2)]">{user.email}</p>
        <span className="mt-4 inline-flex rounded-full border border-[var(--bbt-border)] bg-[var(--bbt-surface-2)] px-3 py-1 font-mono text-xs uppercase tracking-wider text-[var(--bbt-text-3)]">
          {user.role.replace('_', ' ')}
        </span>
      </section>

      <section className="bbt-card overflow-hidden">
        <div className="border-b border-[var(--bbt-border)] p-5">
          <h2 className="text-2xl text-[var(--bbt-text-1)]">Preferences</h2>
          <p className="mt-1 text-sm text-[var(--bbt-text-2)]">Choose the visual mode for this browser.</p>
        </div>
        <ThemeToggle />
      </section>

      <section className="bbt-card p-6">
        <h2 className="text-2xl text-[var(--bbt-text-1)]">Session</h2>
        <p className="mt-2 text-sm text-[var(--bbt-text-2)]">
          Sign out only when you are finished on this device. This action is kept here so the main navigation does not interrupt learning.
        </p>
        {confirming ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { void handleSignOut(); }}
              disabled={signingOut}
              className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
            >
              {signingOut ? 'Signing out...' : 'Confirm sign out'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="bbt-button-secondary px-5 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-5 rounded-xl border border-red-500/30 px-5 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
          >
            Sign out of this device
          </button>
        )}
      </section>
    </div>
  );
}
