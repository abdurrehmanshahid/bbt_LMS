'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BrandLogo } from '@/components/BrandLogo';
import { authApi } from '@/lib/auth';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData): Promise<void> {
    setServerError(null);
    try {
      await authApi.forgotPassword(data.email);
      setSentEmail(data.email);
      setSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="min-h-screen bbt-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <BrandLogo compact priority />
          <h1 className="mt-4 font-display text-3xl bbt-title">Reset your password</h1>
          <p className="mt-1 text-sm bbt-copy">
            Remember it?{' '}
            <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
                <svg className="h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Check your inbox</p>
                <p className="mt-1 text-sm text-navy-400">
                  We sent a reset link to <span className="text-white font-mono">{sentEmail}</span>.
                  It expires in 1 hour.
                </p>
              </div>
              <p className="text-xs text-navy-500">
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-orange-400 hover:text-orange-300 transition-colors"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              <p className="text-sm text-navy-300">
                Enter your email and we&apos;ll send you a link to reset your password.
              </p>

              {serverError && (
                <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                  {serverError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-xs font-mono text-navy-300 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.email ? 'border-red-500' : 'border-navy-600 hover:border-navy-500'
                  }`}
                  placeholder="you@example.com"
                  {...register('email')}
                />
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-1 text-xs text-red-400">{errors.email.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
