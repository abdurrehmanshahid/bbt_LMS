'use client';
import Link from 'next/link';

import { useAuthStore } from '@/lib/store';
import { homeForRole } from '@/lib/utils';

export function ConceptEnrollCTA({ trackSlug }: { trackSlug: string }): React.JSX.Element {
  const { user, accessToken } = useAuthStore();

  if (accessToken && user) {
    return (
      <Link
        href={homeForRole(user.role)}
        className="mt-4 block rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Go to Dashboard →
      </Link>
    );
  }

  return (
    <Link
      href={`/auth/signup?track=${trackSlug}`}
      className="mt-4 block rounded-lg bg-orange-500 py-2.5 text-center text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
    >
      Start Free →
    </Link>
  );
}
