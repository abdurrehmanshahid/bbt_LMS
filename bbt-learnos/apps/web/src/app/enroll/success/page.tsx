'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent(): React.JSX.Element {
  const params = useSearchParams();
  const trackId = params.get('trackId');

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <div className="h-20 w-20 rounded-full bg-green-500/15 flex items-center justify-center">
            <svg className="h-10 w-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
        </div>

        <div>
          <h1 className="font-display text-4xl text-white">You&apos;re enrolled!</h1>
          <p className="mt-3 text-navy-300">
            Your enrollment is confirmed. Head to your dashboard to start learning.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="block rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
          >
            Go to Dashboard
          </Link>
          {trackId && (
            <Link
              href={`/learner/track/${trackId}`}
              className="block rounded-xl border border-navy-600 py-3 text-sm font-semibold text-white hover:border-navy-400 transition-colors"
            >
              View My Track
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EnrollSuccessPage(): React.JSX.Element {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
