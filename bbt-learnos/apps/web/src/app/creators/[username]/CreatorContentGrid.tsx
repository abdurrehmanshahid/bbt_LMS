'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuthStore } from '@/lib/store';
import { learnerApi } from '@/lib/learner';
import { useQuery } from '@tanstack/react-query';

interface ContentItem {
  id: string;
  title: string;
  type: string;
  muxPlaybackId: string | null;
  thumbnailUrl: string | null;
  viewCount: number;
  duration: number | null;
  createdAt: string;
  track: { title: string; slug: string; icon: string; id?: string };
  _count: { comments: number; reactions: number };
}

const TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'REEL', label: 'Reels' },
  { key: 'LECTURE', label: 'Lectures' },
  { key: 'RESOURCE', label: 'Resources' },
] as const;

export function CreatorContentGrid({ content }: { content: ContentItem[] }) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'REEL' | 'LECTURE' | 'RESOURCE'>('ALL');
  const { accessToken } = useAuthStore();

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => learnerApi.getEnrollments(accessToken!),
    enabled: !!accessToken,
  });

  const enrolledSlugs = new Set(enrollments?.filter((e) => e.status === 'ACTIVE').map((e) => e.track.slug) ?? []);

  const filtered = activeTab === 'ALL' ? content : content.filter((c) => c.type === activeTab);

  return (
    <section>
      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-mono transition-colors ${
              activeTab === key
                ? 'bg-orange-500 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-60">
              {key === 'ALL' ? content.length : content.filter((c) => c.type === key).length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">No {activeTab.toLowerCase()} yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => {
            const isLocked = accessToken
              ? !enrolledSlugs.has(item.track.slug)
              : true;
            const thumbnail = item.thumbnailUrl;

            return (
              <article
                key={item.id}
                className="group rounded-xl border border-slate-700 bg-slate-900 overflow-hidden hover:border-[#F7941D]/50 transition-colors"
              >
                <div className="aspect-video bg-slate-800 relative overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={item.title}
                      className={`h-full w-full object-cover transition-all ${isLocked ? 'blur-sm scale-105 opacity-60' : ''}`}
                    />
                  ) : (
                    <div className={`flex h-full items-center justify-center text-slate-600 text-4xl ${isLocked ? 'opacity-40' : ''}`}>
                      {item.type === 'REEL' ? '▶' : item.type === 'LECTURE' ? '🎓' : '📄'}
                    </div>
                  )}
                  {item.duration && !isLocked && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">
                      {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
                    </span>
                  )}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-navy-900/70 gap-2 px-4">
                      <svg className="h-6 w-6 text-orange-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      <p className="text-xs text-white text-center line-clamp-2">
                        Enroll in {item.track.title} to unlock
                      </p>
                      <Link
                        href={`/tracks/${item.track.slug}`}
                        className="mt-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Enroll
                      </Link>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs text-[#F7941D]">{item.track.icon} {item.track.title}</p>
                  {isLocked ? (
                    <h3 className="mt-1 text-sm font-semibold text-white/50 line-clamp-2">{item.title}</h3>
                  ) : (
                    <Link href={`/content/${item.id}`}>
                      <h3 className="mt-1 text-sm font-semibold text-white line-clamp-2 group-hover:text-[#F7941D] transition-colors">
                        {item.title}
                      </h3>
                    </Link>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span>{item.viewCount.toLocaleString()} views</span>
                    <span>💬 {item._count.comments}</span>
                    <span>⚡ {item._count.reactions}</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
