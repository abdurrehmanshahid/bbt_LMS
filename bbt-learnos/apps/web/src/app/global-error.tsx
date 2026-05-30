'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-navy-950 px-6 text-white">
          <section className="w-full max-w-md space-y-5 rounded-lg border border-navy-700 bg-navy-900 p-8 shadow-xl">
            <div className="space-y-2">
              <p className="font-mono text-xs uppercase tracking-wide text-orange-400">
                Platform error
              </p>
              <h1 className="font-display text-4xl text-white">Something went wrong</h1>
              <p className="text-sm leading-6 text-navy-200">
                The issue has been reported. Try again or return to the dashboard.
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-lg bg-orange-500 px-4 py-3 text-sm font-bold text-navy-950 transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
