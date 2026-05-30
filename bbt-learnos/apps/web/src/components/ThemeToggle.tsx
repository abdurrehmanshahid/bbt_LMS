'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem('bbt-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(next: Theme): void {
  window.localStorage.setItem('bbt-theme', next);
  document.documentElement.classList.toggle('dark', next === 'dark');
}

export function ThemeToggle({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const [theme, setTheme] = useState<Theme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = getInitialTheme();
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    setReady(true);
  }, []);

  function toggleTheme(): void {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] text-[var(--bbt-text-2)] transition-colors hover:bg-[var(--bbt-surface-2)] hover:text-[var(--bbt-text-1)]"
        aria-label={ready ? (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode') : 'Toggle theme'}
      >
        {!ready || theme === 'dark' ? (
          /* Sun icon */
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          /* Moon icon */
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex w-full items-center justify-between px-4 py-2.5 text-sm text-[var(--bbt-text-2)] transition-colors hover:bg-[var(--bbt-surface-2)] hover:text-[var(--bbt-text-1)]"
      aria-label="Toggle color theme"
    >
      <span>Theme</span>
      <span className="rounded-full border border-[var(--bbt-border)] bg-[var(--bbt-surface-1)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--bbt-text-3)]">
        {ready ? theme : 'dark'}
      </span>
    </button>
  );
}
