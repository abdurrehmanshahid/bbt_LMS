'use client';

import React, { useEffect, useState } from 'react';

interface Slot {
  id: string;
  title: string;
  durationMin: number;
  startsAt: string;
  isBooked: boolean;
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

export default function CreatorMentorshipPage(): React.JSX.Element {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title: 'Office Hours', durationMin: 30, startsAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [upgradeStatus, setUpgradeStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const loadSlots = async () => {
    try {
      const data = await api<Slot[]>('/creator/mentorship/slots');
      setSlots(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadSlots(); }, []);

  const createSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api('/creator/mentorship/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ title: 'Office Hours', durationMin: 30, startsAt: '' });
      await loadSlots();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      await api(`/creator/mentorship/slots/${slotId}`, { method: 'DELETE' });
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const requestUpgrade = async () => {
    try {
      const res = await api<{ currentTier: number; requestedTier: number }>('/creator/mentorship/tier-upgrade', { method: 'POST' });
      setUpgradeStatus('success');
      setUpgradeMsg(`Upgrade to Tier ${res.requestedTier} requested — admin will review within 72h`);
    } catch (e) {
      setUpgradeStatus('error');
      setUpgradeMsg((e as Error).message);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mentorship Slots</h1>
          <p className="mt-1 text-sm text-slate-400">Offer 1:1 sessions to learners — requires Tier 2+</p>
        </div>
        <button
          onClick={() => void requestUpgrade()}
          className="rounded-lg border border-[#F7941D] px-4 py-2 text-sm text-[#F7941D] hover:bg-[#F7941D]/10"
        >
          Request Tier Upgrade
        </button>
      </div>

      {upgradeMsg && (
        <div className={`rounded-lg px-4 py-3 text-sm ${upgradeStatus === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          {upgradeMsg}
        </div>
      )}

      {/* Create slot form */}
      <form onSubmit={(e) => void createSlot(e)} className="rounded-xl border border-slate-700 bg-slate-900 p-6 space-y-4">
        <h2 className="font-semibold text-white">Add a new slot</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-slate-400">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-[#2E3192] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-400">Duration (minutes)</label>
            <select
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-[#2E3192] focus:outline-none"
            >
              {[15, 30, 45, 60].map((d) => <option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Starts At</label>
          <input
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-[#2E3192] focus:outline-none"
            required
          />
        </div>
        {formError && <p className="text-sm text-red-400">{formError}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-[#2E3192] px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Slot'}
        </button>
      </form>

      {/* Slot list */}
      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading…</div>
      ) : error ? (
        <div className="rounded-lg bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-slate-500">
          No upcoming slots — create one above
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => (
            <div
              key={slot.id}
              className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-5 py-4"
            >
              <div>
                <p className="font-medium text-white">{slot.title}</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {new Date(slot.startsAt).toLocaleString()} · {slot.durationMin} min
                </p>
              </div>
              <div className="flex items-center gap-3">
                {slot.isBooked ? (
                  <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">Booked</span>
                ) : (
                  <span className="rounded-full bg-slate-700 px-3 py-1 text-xs text-slate-300">Available</span>
                )}
                {!slot.isBooked && (
                  <button
                    onClick={() => void deleteSlot(slot.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
