'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { learnerApi } from '@/lib/learner';
import { useAuthStore } from '@/lib/store';

interface Props {
  trackId: string;
  trackSlug: string;
  freeModuleCount: number;
  compact?: boolean;
}

type EnrollState = 'checking' | 'unauthenticated' | 'not_enrolled' | 'enrolling' | 'enrolled' | 'error';

export function TrackEnrollCTA({ trackId, trackSlug, freeModuleCount, compact = false }: Props): React.JSX.Element {
  const router = useRouter();
  const { user, accessToken, hasHydrated, clearAuth } = useAuthStore();
  const [state, setState] = useState<EnrollState>('checking');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!hasHydrated) { setState('checking'); return; }
    if (!accessToken) { setState('unauthenticated'); return; }
    setState('checking');
    learnerApi.getEnrollments(accessToken)
      .then((enrollments) => {
        const found = enrollments.find((e) => e.trackId === trackId && e.status === 'ACTIVE');
        setState(found ? 'enrolled' : 'not_enrolled');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401')) {
          clearAuth();
          setState('unauthenticated');
          return;
        }
        setState('not_enrolled');
      });
  }, [accessToken, clearAuth, hasHydrated, trackId]);

  async function handleEnrollFree(): Promise<void> {
    if (!hasHydrated) return;
    if (!accessToken) { router.push(`/auth/signup?track=${trackSlug}`); return; }
    setState('enrolling');
    setErrorMsg('');
    try {
      await learnerApi.enrollFree(accessToken, trackId);
      setState('enrolled');
      router.push(`/track/${trackId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409') || msg.includes('already')) {
        setState('enrolled');
        router.push(`/track/${trackId}`);
      } else if (msg.includes('401')) {
        clearAuth();
        setState('unauthenticated');
        setErrorMsg('Session expired. Sign in again to enroll.');
        router.push(`/auth/login?returnUrl=${encodeURIComponent(`/tracks/${trackSlug}`)}`);
      } else if (msg.includes('403')) {
        setErrorMsg('Use a learner account to enroll in tracks.');
        setState('error');
      } else {
        setErrorMsg(
          msg.includes('Failed to fetch')
            ? 'API is not running. Start the LMS debug profile so localhost:4000 is available.'
            : msg.replace(/^API error \d+:\s*/, '') || 'Could not enroll. Please try again.',
        );
        setState('error');
      }
    }
  }

  if (compact) {
    if (state === 'checking') {
      return (
        <div className="mt-5 h-10 animate-pulse rounded-[14px] bg-white/10" />
      );
    }
    if (state === 'enrolled') {
      return (
        <Link href={`/track/${trackId}`} className="bbt-button-secondary mt-5 w-full py-2.5 text-sm">
          Open Track
        </Link>
      );
    }
    if (state === 'enrolling') {
      return (
        <button disabled className="bbt-button-secondary mt-5 w-full cursor-not-allowed py-2.5 text-sm opacity-60">
          Enrolling...
        </button>
      );
    }
    if (state === 'not_enrolled' || state === 'error') {
      return (
        <>
          <button
            type="button"
            onClick={() => { void handleEnrollFree(); }}
            className="bbt-button-primary mt-5 w-full py-2.5 text-sm"
          >
            Enroll Free
          </button>
          {errorMsg && <p className="mt-1.5 text-center text-xs text-red-400">{errorMsg}</p>}
        </>
      );
    }
    return (
      <Link
        href={`/auth/signup?track=${trackSlug}`}
        className="bbt-button-primary mt-5 w-full py-2.5 text-sm"
      >
        Start Free
      </Link>
    );
  }

  if (state === 'checking') {
    return (
      <div className="h-11 w-56 animate-pulse rounded-xl bg-orange-500/30" />
    );
  }

  if (state === 'enrolled') {
    return (
      <Link
        href={`/track/${trackId}`}
        className="bbt-button-secondary h-11 px-6 text-sm"
      >
        Open Track
      </Link>
    );
  }

  if (state === 'enrolling') {
    return (
      <button
        disabled
        className="bbt-button-primary h-11 cursor-not-allowed px-6 text-sm opacity-60"
      >
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Enrolling...
      </button>
    );
  }

  if (state === 'not_enrolled' || state === 'error') {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => { void handleEnrollFree(); }}
          className="bbt-button-primary h-11 px-6 text-sm"
        >
          {user ? 'Enroll Free' : 'Start Free'} - {freeModuleCount} modules unlocked
        </button>
        {errorMsg && <p className="text-xs text-red-400">{errorMsg}</p>}
      </div>
    );
  }

  return (
    <Link
      href={`/auth/signup?track=${trackSlug}`}
      className="bbt-button-primary h-11 px-6 text-sm"
    >
      Start Free - {freeModuleCount} modules unlocked
    </Link>
  );
}
