'use client';

import React, { useEffect, useState, useCallback } from 'react';

import { REACTION_EMOJIS, TIER_COLOR } from '@/lib/constants';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  thumbnailUrl: string | null;
  duration: number | null;
  viewCount: number;
  createdAt: string;
  track: { title: string; slug: string; icon: string };
  creator: {
    id: string;
    name: string;
    avatarUrl: string | null;
    creatorProfile: { displayName: string; tier: number } | null;
  };
  _count: { comments: number; reactions: number };
}

interface ReactionCounts {
  LIKE: number;
  FIRE: number;
  MIND_BLOWN: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

const TIER_COLORS = TIER_COLOR;

function FeedCard({ item }: { item: ContentItem }): React.JSX.Element {
  const [reactions, setReactions] = useState<ReactionCounts | null>(null);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const loadReactions = useCallback(async () => {
    try {
      const data = await api<ReactionCounts>(`/content/${item.id}/reactions`);
      setReactions(data);
    } catch { /* silent */ }
  }, [item.id]);

  useEffect(() => { void loadReactions(); }, [loadReactions]);

  const react = async (type: string) => {
    try {
      if (userReaction === type) {
        const res = await api<{ counts: ReactionCounts }>(`/content/${item.id}/react`, { method: 'DELETE' });
        setReactions(res.counts);
        setUserReaction(null);
      } else {
        const res = await api<{ userReaction: string; counts: ReactionCounts }>(`/content/${item.id}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        });
        setReactions(res.counts);
        setUserReaction(res.userReaction);
      }
    } catch { /* silent */ }
  };

  const mins = item.duration ? Math.round(item.duration / 60) : null;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
      {item.thumbnailUrl && (
        <a href={`/dashboard?content=${item.id}`}>
          <div className="relative aspect-video bg-slate-800">
            <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
            {mins && (
              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                {mins}m
              </span>
            )}
          </div>
        </a>
      )}
      <div className="p-4">
        {/* Creator row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-[#2E3192] flex items-center justify-center text-xs font-bold text-white shrink-0">
            {item.creator.name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <a
              href={`/creators/${item.creator.creatorProfile?.displayName ?? item.creator.id}`}
              className={`text-sm font-medium hover:underline ${TIER_COLORS[item.creator.creatorProfile?.tier ?? 1]}`}
            >
              {item.creator.creatorProfile?.displayName ?? item.creator.name}
            </a>
            <span className="ml-2 text-xs text-slate-500">{item.track.icon} {item.track.title}</span>
          </div>
          <span className="ml-auto text-xs text-slate-600">
            {new Date(item.createdAt).toLocaleDateString()}
          </span>
        </div>

        <a href={`/dashboard?content=${item.id}`}>
          <h3 className="font-semibold text-white hover:text-[#F7941D] transition-colors line-clamp-2">{item.title}</h3>
        </a>

        {/* Reactions + stats */}
        <div className="mt-3 flex items-center gap-3">
          {(['LIKE', 'FIRE', 'MIND_BLOWN'] as const).map((type) => (
            <button
              key={type}
              onClick={() => void react(type)}
              className={`flex items-center gap-1 rounded-lg px-2 py-1 text-sm transition-colors ${
                userReaction === type
                  ? 'bg-[#F7941D]/20 text-[#F7941D]'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {REACTION_EMOJIS[type]} {reactions ? reactions[type] : item._count.reactions}
            </button>
          ))}
          <a
            href={`/dashboard?content=${item.id}#comments`}
            className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            💬 {item._count.comments}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function SocialFeedPage(): React.JSX.Element {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadFeed = async (nextCursor?: string) => {
    try {
      const url = `/social/feed${nextCursor ? `?cursor=${encodeURIComponent(nextCursor)}` : ''}`;
      const data = await api<{ items: ContentItem[]; nextCursor: string | null }>(url);
      setItems((prev) => nextCursor ? [...prev, ...data.items] : data.items);
      setCursor(data.nextCursor);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => { void loadFeed(); }, []);

  const loadMore = () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    void loadFeed(cursor);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Following Feed</h1>
          <p className="text-sm text-slate-400 mt-1">Latest from creators you follow</p>
        </div>
        <a
          href="/leaderboard"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-[#F7941D] hover:text-[#F7941D]"
        >
          🏆 Leaderboard
        </a>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-xl border border-slate-700 bg-slate-900 h-64 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-16 text-center">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-white font-medium">Your feed is empty</p>
          <p className="text-slate-400 text-sm mt-1">Follow creators to see their content here</p>
          <a href="/tracks" className="mt-4 inline-block rounded-lg bg-[#2E3192] px-5 py-2 text-sm text-white hover:bg-indigo-700">
            Explore Tracks
          </a>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => <FeedCard key={item.id} item={item} />)}
          </div>
          {cursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-6 w-full rounded-xl border border-slate-700 py-3 text-sm text-slate-400 hover:border-slate-500 hover:text-white disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
