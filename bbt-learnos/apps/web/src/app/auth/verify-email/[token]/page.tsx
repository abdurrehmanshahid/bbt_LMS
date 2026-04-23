'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Props {
  params: { token: string };
}

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage({ params }: Props): React.JSX.Element {
  const [status, setStatus] = useState<Status>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

    fetch(`${apiBase}/auth/verify-email/${params.token}`, { method: 'POST' })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
        } else {
          const body = await res.json() as { message?: string };
          setErrorMessage(body.message ?? 'Verification failed.');
          setStatus('error');
        }
      })
      .catch(() => {
        setErrorMessage('Unable to connect. Please try again.');
        setStatus('error');
      });
  }, [params.token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-display text-2xl text-white">BBT</span>
            <span className="font-mono text-xs text-orange-500 border border-orange-500 px-1.5 py-0.5 rounded">LearnOS</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-10 text-center">
          {status === 'verifying' && (
            <div className="space-y-4">
              <svg className="mx-auto h-12 w-12 animate-spin text-orange-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="font-display text-xl text-white">Verifying your email…</p>
              <p className="text-sm text-navy-400">This only takes a moment.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
                <svg className="h-8 w-8 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-2xl text-white">Email verified!</p>
                <p className="mt-2 text-sm text-navy-400">Your account is now active. You&apos;re ready to start learning.</p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Sign in now →
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-900/40 border border-red-700 flex items-center justify-center">
                <svg className="h-8 w-8 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="font-display text-2xl text-white">Verification failed</p>
                <p className="mt-2 text-sm text-navy-400">
                  {errorMessage ?? 'This link has expired or is invalid.'}
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/auth/signup"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Back to signup
                </Link>
                <Link
                  href="/auth/login"
                  className="text-sm text-navy-400 hover:text-navy-200 transition-colors"
                >
                  Already verified? Sign in
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
