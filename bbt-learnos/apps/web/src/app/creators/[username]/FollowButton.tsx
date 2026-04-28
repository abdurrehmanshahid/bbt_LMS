'use client';

import React, { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function FollowButton({
  creatorId,
  initialFollowing,
}: {
  creatorId: string;
  initialFollowing: boolean;
}): React.JSX.Element {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/social/creators/${creatorId}/follow`, {
        method: following ? 'DELETE' : 'POST',
        credentials: 'include',
      });
      if (res.ok) setFollowing(!following);
      else if (res.status === 401) {
        window.location.href = '/auth/login';
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={() => void toggle()}
      disabled={loading}
      className={`shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
        following
          ? 'border border-slate-600 bg-transparent text-slate-300 hover:border-red-500 hover:text-red-400'
          : 'bg-[#F7941D] text-white hover:bg-orange-500'
      }`}
    >
      {loading ? '…' : following ? 'Following' : 'Follow'}
    </button>
  );
}
