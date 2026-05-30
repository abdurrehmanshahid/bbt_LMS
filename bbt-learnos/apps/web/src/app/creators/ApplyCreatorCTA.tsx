'use client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuthStore } from '@/lib/store';

export function ApplyCreatorCTA({ className }: { className?: string }): React.JSX.Element {
  const { user, accessToken, clearAuth } = useAuthStore();
  const router = useRouter();

  const btnClass = className ?? 'bbt-button-primary inline-flex px-6 py-3 text-sm';

  if (accessToken && user?.role === 'CREATOR') {
    return (
      <Link href="/creator/dashboard" className={btnClass}>
        Go to Studio →
      </Link>
    );
  }

  if (accessToken && user?.role === 'LEARNER') {
    return (
      <button
        className={btnClass}
        onClick={() => {
          clearAuth();
          router.push('/auth/signup?role=CREATOR');
        }}
      >
        Create Creator Account →
      </button>
    );
  }

  return (
    <Link href="/auth/signup?role=CREATOR" className={btnClass}>
      Apply as Creator →
    </Link>
  );
}
