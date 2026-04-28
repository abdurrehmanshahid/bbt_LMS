'use client';

import React, { useEffect, useState } from 'react';

interface JoinResponse {
  id: string;
  title: string;
  status: string;
  dailyRoomUrl: string | null;
  participantToken: string;
  track: { title: string; icon: string };
  creator: { name: string };
  scheduledAt: string;
  startedAt: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function LiveSessionPage({
  params,
}: {
  params: { sessionId: string };
}): React.JSX.Element {
  const [session, setSession] = useState<JoinResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch(`${API}/learner/live-sessions/${params.sessionId}/join`, {
          credentials: 'include',
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string };
          setError(body.message ?? 'Unable to join session');
          return;
        }
        const data = await res.json() as JoinResponse;
        setSession(data);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    void fetchSession();
  }, [params.sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0d2e]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#F7941D] border-t-transparent" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0d0d2e] text-white">
        <span className="text-4xl">⚠️</span>
        <p className="text-lg font-medium">{error ?? 'Session not found'}</p>
        <a href="/dashboard" className="rounded-lg bg-[#2E3192] px-6 py-2 text-sm hover:bg-indigo-700">
          Back to Dashboard
        </a>
      </div>
    );
  }

  if (session.status === 'SCHEDULED') {
    const scheduledDate = new Date(session.scheduledAt).toLocaleString();
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0d0d2e] text-white">
        <div className="rounded-full bg-[#2E3192]/30 p-6 text-5xl">{session.track.icon}</div>
        <div className="text-center">
          <p className="text-sm uppercase tracking-widest text-[#F7941D]">{session.track.title}</p>
          <h1 className="mt-1 text-2xl font-bold">{session.title}</h1>
          <p className="mt-2 text-slate-400">Scheduled for {scheduledDate}</p>
          <p className="mt-1 text-sm text-slate-500">by {session.creator.name}</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400">
          <span className="h-2 w-2 rounded-full bg-yellow-400" />
          Session not started yet — come back closer to the scheduled time
        </div>
        <a href="/dashboard" className="text-sm text-slate-500 underline hover:text-white">
          Back to Dashboard
        </a>
      </div>
    );
  }

  const iframeSrc = session.dailyRoomUrl
    ? `${session.dailyRoomUrl}?t=${session.participantToken}`
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#0d0d2e]">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xl">{session.track.icon}</span>
          <div>
            <p className="text-xs uppercase tracking-widest text-[#F7941D]">{session.track.title}</p>
            <h1 className="text-sm font-semibold text-white">{session.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
            LIVE
          </span>
          <span className="text-xs text-slate-500">by {session.creator.name}</span>
        </div>
      </div>

      {/* Daily.co iframe */}
      {iframeSrc ? (
        <iframe
          src={iframeSrc}
          className="flex-1"
          allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
          title={session.title}
          style={{ border: 'none', minHeight: 'calc(100vh - 56px)' }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          <p>Room URL not available. Please refresh or contact support.</p>
        </div>
      )}
    </div>
  );
}
