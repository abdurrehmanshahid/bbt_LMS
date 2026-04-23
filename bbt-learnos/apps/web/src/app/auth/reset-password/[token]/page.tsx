'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/lib/auth';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number')
      .regex(/[^A-Za-z0-9]/, 'Must contain a special character'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  params: { token: string };
}

export default function ResetPasswordPage({ params }: Props): React.JSX.Element {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData): Promise<void> {
    setServerError(null);
    try {
      await authApi.resetPassword(params.token, data.password);
      setDone(true);
      setTimeout(() => router.push('/auth/login'), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('TOKEN_EXPIRED') || msg.includes('TOKEN_INVALID')) {
        setServerError('This reset link has expired or is invalid. Please request a new one.');
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-display text-2xl text-white">BBT</span>
            <span className="font-mono text-xs text-orange-500 border border-orange-500 px-1.5 py-0.5 rounded">LearnOS</span>
          </Link>
          <h1 className="mt-4 font-display text-3xl text-white">Choose a new password</h1>
        </div>

        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8">
          {done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-green-900/40 border border-green-700 flex items-center justify-center">
                <svg className="h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">Password updated</p>
                <p className="mt-1 text-sm text-navy-400">Redirecting you to sign in…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
              {serverError && (
                <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                  {serverError}
                  {serverError.includes('expired') && (
                    <p className="mt-2">
                      <Link href="/auth/forgot-password" className="text-orange-400 hover:text-orange-300 underline">
                        Request a new link →
                      </Link>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label htmlFor="password" className="block text-xs font-mono text-navy-300 mb-1.5">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'pw-error' : undefined}
                    className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 pr-11 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                      errors.password ? 'border-red-500' : 'border-navy-600 hover:border-navy-500'
                    }`}
                    placeholder="8+ chars, uppercase, number, symbol"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200 transition-colors"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p id="pw-error" role="alert" className="mt-1 text-xs text-red-400">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-xs font-mono text-navy-300 mb-1.5">
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                  className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-navy-600 hover:border-navy-500'
                  }`}
                  placeholder="Repeat your new password"
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p id="confirm-error" role="alert" className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
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
                {isSubmitting ? 'Saving…' : 'Set new password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
