'use client';

import React, { useEffect, useState } from 'react';

interface AvailableSlot {
  id: string;
  title: string;
  durationMin: number;
  startsAt: string;
}

interface Creator {
  creatorId: string;
  displayName: string;
  name: string;
  avatarUrl: string | null;
  tier: number;
  qualityScore: number;
  bio: string;
  availableSlots: AvailableSlot[];
}

interface Booking {
  bookingId: string;
  status: string;
  roomUrl: string | null;
  startsAt: string;
  durationMin: number;
  title: string;
  creatorDisplayName: string;
  creatorTier: number;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: 'include', ...opts });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `${res.status}`);
  }
  return res.json() as Promise<T>;
}

const TIER_LABELS: Record<number, string> = { 1: 'Starter', 2: 'Verified', 3: 'Expert' };
const TIER_COLORS: Record<number, string> = {
  1: 'bg-slate-700 text-slate-300',
  2: 'bg-blue-500/20 text-blue-300',
  3: 'bg-[#F7941D]/20 text-[#F7941D]',
};

export default function LearnerMentorshipPage(): React.JSX.Element {
  const [tab, setTab] = useState<'browse' | 'bookings'>('browse');
  const [creators, setCreators] = useState<Creator[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null); // slotId being booked

  const loadData = async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([
        api<Creator[]>('/learner/mentorship/creators'),
        api<Booking[]>('/learner/mentorship/bookings'),
      ]);
      setCreators(c);
      setBookings(b);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadData(); }, []);

  const bookSlot = async (slotId: string) => {
    setBooking(slotId);
    try {
      await api(`/learner/mentorship/slots/${slotId}/book`, { method: 'POST' });
      await loadData();
      setTab('bookings');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBooking(null);
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this session?')) return;
    try {
      await api(`/learner/mentorship/bookings/${bookingId}`, { method: 'DELETE' });
      setBookings((prev) => prev.map((b) => b.bookingId === bookingId ? { ...b, status: 'CANCELLED' } : b));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Expert Mentorship</h1>
        <p className="mt-1 text-sm text-slate-400">Book 1:1 sessions with Tier 2 & 3 creators</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-700 bg-slate-900 p-1 w-fit">
        {(['browse', 'bookings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-[#2E3192] text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'browse' ? 'Browse Mentors' : `My Bookings${bookings.filter((b) => b.status === 'CONFIRMED').length ? ` (${bookings.filter((b) => b.status === 'CONFIRMED').length})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading…</div>
      ) : tab === 'browse' ? (
        creators.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-14 text-center text-slate-500">
            No mentors with available slots right now — check back soon
          </div>
        ) : (
          <div className="space-y-4">
            {creators.map((c) => (
              <div key={c.creatorId} className="rounded-xl border border-slate-700 bg-slate-900 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#2E3192] text-lg font-bold text-white">
                    {c.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{c.displayName || c.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TIER_COLORS[c.tier] ?? ''}`}>
                        {TIER_LABELS[c.tier]}
                      </span>
                      <span className="text-xs text-slate-500">Quality {c.qualityScore}%</span>
                    </div>
                    {c.bio && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{c.bio}</p>}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Available slots</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {c.availableSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-lg border border-slate-700 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{slot.title}</p>
                          <p className="text-xs text-slate-400">
                            {new Date(slot.startsAt).toLocaleString()} · {slot.durationMin} min
                          </p>
                        </div>
                        <button
                          onClick={() => void bookSlot(slot.id)}
                          disabled={booking === slot.id}
                          className="ml-3 rounded-lg bg-[#F7941D] px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-500 disabled:opacity-50"
                        >
                          {booking === slot.id ? '…' : 'Book'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : bookings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-14 text-center text-slate-500">
          No bookings yet — browse mentors to schedule a session
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.bookingId} className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{b.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${TIER_COLORS[b.creatorTier] ?? ''}`}>
                    {TIER_LABELS[b.creatorTier]}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  with {b.creatorDisplayName} · {new Date(b.startsAt).toLocaleString()} · {b.durationMin} min
                </p>
              </div>
              <div className="flex items-center gap-3">
                {b.status === 'CONFIRMED' ? (
                  <>
                    {b.roomUrl && (
                      <a
                        href={b.roomUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-[#2E3192] px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Join
                      </a>
                    )}
                    <button
                      onClick={() => void cancelBooking(b.bookingId)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-400 capitalize">
                    {b.status.toLowerCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
