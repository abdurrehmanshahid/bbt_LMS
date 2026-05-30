'use client';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { BrandLogo } from '@/components/BrandLogo';
import { getTrack } from '@/lib/api';
import { authApi } from '@/lib/auth';
import { learnerApi } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
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

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-orange-400' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-yellow-400' };
  return { score, label: 'Strong', color: 'bg-green-500' };
}

export default function SignupPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const role = searchParams.get('role') ?? undefined;
  const trackSlug = searchParams.get('track') ?? undefined;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const pwValue = watch('password', '');
  const strength = passwordStrength(pwValue);

  async function onSubmit(data: FormData): Promise<void> {
    setServerError(null);
    try {
      const res = await authApi.signup({ name: data.name, email: data.email, password: data.password, ...(role ? { role } : {}) });
      setAuth(res.user, res.accessToken);
      if (trackSlug && (!role || role === 'LEARNER')) {
        try {
          const track = await getTrack(trackSlug);
          await learnerApi.enrollFree(res.accessToken, track.id);
          router.push(`/track/${track.id}`);
          return;
        } catch (enrollErr) {
          const msg = enrollErr instanceof Error ? enrollErr.message : '';
          if (msg.includes('409') || msg.includes('already')) {
            const track = await getTrack(trackSlug);
            router.push(`/track/${track.id}`);
            return;
          }
          router.push(`/tracks/${trackSlug}`);
          return;
        }
      }
      router.push('/onboarding/quiz');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

  return (
    <div className="min-h-screen bbt-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <BrandLogo priority />
          <h1 className="mt-4 font-display text-3xl bbt-title">Create your account</h1>
          <p className="mt-1 text-sm bbt-copy">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-orange-400 hover:text-orange-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <div className="rounded-2xl border border-navy-700 bg-navy-900 p-8">
          {/* OAuth buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <a
              href={`${apiBase}/auth/google`}
              className="flex items-center justify-center gap-3 rounded-lg border border-navy-700 bg-navy-800 py-2.5 text-sm font-medium text-white hover:border-navy-500 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </a>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-navy-700" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-navy-900 px-3 text-xs font-mono text-navy-500">or continue with email</span>
            </div>
          </div>

          <form
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSubmit(onSubmit)(event);
            }}
            noValidate
            className="space-y-5"
          >
            {serverError && (
              <div role="alert" className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
                {serverError}
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-xs font-mono text-navy-300 mb-1.5">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                  errors.name ? 'border-red-500' : 'border-navy-600 hover:border-navy-500'
                }`}
                placeholder="Abdur Rehman"
                {...register('name')}
              />
              {errors.name && (
                <p id="name-error" role="alert" className="mt-1 text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-mono text-navy-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  aria-describedby="password-strength password-error"
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
              {/* Strength meter */}
              {pwValue.length > 0 && (
                <div id="password-strength" aria-live="polite" className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-navy-700'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs font-mono text-navy-400">
                    Strength: <span className="text-white">{strength.label}</span>
                  </p>
                </div>
              )}
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-mono text-navy-300 mb-1.5">
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
                  className={`w-full rounded-lg border bg-navy-800 px-4 py-2.5 pr-11 text-sm text-white placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                    errors.confirmPassword ? 'border-red-500' : 'border-navy-600 hover:border-navy-500'
                  }`}
                  placeholder="Repeat your password"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-200 transition-colors"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? (
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
              {errors.confirmPassword && (
                <p id="confirm-error" role="alert" className="mt-1 text-xs text-red-400">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => { void handleSubmit(onSubmit)(); }}
              disabled={isSubmitting}
              className="w-full rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>

            <p className="text-center text-xs text-navy-500">
              By signing up you agree to our{' '}
              <Link href="/terms" className="text-navy-400 hover:text-navy-200 transition-colors">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-navy-400 hover:text-navy-200 transition-colors">Privacy Policy</Link>.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
