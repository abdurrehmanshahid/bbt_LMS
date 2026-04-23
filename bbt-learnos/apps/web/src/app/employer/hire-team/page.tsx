'use client';
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { submitHireTeam } from '@/lib/employer';

const ROLES = [
  'Full Stack',
  'Cloud',
  'UI/UX',
  'Cybersecurity',
  'AI/ML',
  'ERP Developer',
  'Marketing/Sales',
];

const SENIORITY = ['junior', 'mid', 'senior'];

const MONTHLY_RATES: Record<string, number> = {
  'Full Stack': 4500,
  'Cloud': 5000,
  'UI/UX': 3800,
  'Cybersecurity': 5500,
  'AI/ML': 6000,
  'ERP Developer': 4000,
  'Marketing/Sales': 3500,
};

const SENIORITY_MUL: Record<string, number> = { junior: 1, mid: 1.1, senior: 1.4 };

interface RoleSlot {
  id: number;
  role: string;
  skills: string;
  seniority: string;
}

let nextId = 1;

export default function HireTeamPage(): React.JSX.Element {
  const token = useAuthStore((s) => s.accessToken);

  const [slots, setSlots] = useState<RoleSlot[]>([
    { id: nextId++, role: 'Full Stack', skills: '', seniority: 'mid' },
  ]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ id: string; estimatedMonthly: number } | null>(null);

  const mut = useMutation({
    mutationFn: () =>
      submitHireTeam(
        {
          roles: slots.map((s) => ({
            role: s.role,
            skills: s.skills.split(',').map((sk) => sk.trim()).filter(Boolean),
            seniority: s.seniority,
          })),
          ...(notes ? { notes } : {}),
        },
        token!,
      ),
    onSuccess: (data) => setResult({ id: data.id, estimatedMonthly: data.estimatedMonthly }),
    onError: (e: Error) => setError(e.message),
  });

  const addSlot = () =>
    setSlots((s) => [...s, { id: nextId++, role: 'Full Stack', skills: '', seniority: 'mid' }]);

  const removeSlot = (id: number) =>
    setSlots((s) => s.filter((slot) => slot.id !== id));

  const updateSlot = (id: number, patch: Partial<Omit<RoleSlot, 'id'>>) =>
    setSlots((s) => s.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));

  const estimatedTotal = slots.reduce((sum, s) => {
    const base = MONTHLY_RATES[s.role] ?? 4000;
    const mul = SENIORITY_MUL[s.seniority] ?? 1;
    return sum + base * mul;
  }, 0);

  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-[#0d0d2e]">Team request submitted!</h2>
        <p className="text-gray-500 text-sm">Request ID: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{result.id}</code></p>
        <div className="bg-[#0d0d2e] text-white rounded-xl p-6">
          <p className="text-sm text-white/60">Estimated monthly cost</p>
          <p className="text-3xl font-bold mt-1">${result.estimatedMonthly.toLocaleString()}</p>
          <p className="text-xs text-white/40 mt-1">USD · based on market rates</p>
        </div>
        <p className="text-sm text-gray-500">Our team will reach out within 2 business days with matched profiles.</p>
        <button
          onClick={() => { setResult(null); setSlots([{ id: nextId++, role: 'Full Stack', skills: '', seniority: 'mid' }]); setNotes(''); }}
          className="text-sm text-[#2E3192] underline"
        >
          Build another team
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d0d2e]">Hire a Team</h1>
        <p className="text-sm text-gray-500 mt-1">Build a dedicated team of verified BBT graduates</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Role builder */}
        <div className="lg:col-span-2 space-y-4">
          {slots.map((slot) => (
            <div key={slot.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-[#0d0d2e] text-sm">Role</h3>
                {slots.length > 1 && (
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Role type</label>
                  <select
                    value={slot.role}
                    onChange={(e) => updateSlot(slot.id, { role: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Seniority</label>
                  <select
                    value={slot.seniority}
                    onChange={(e) => updateSlot(slot.id, { seniority: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
                  >
                    {SENIORITY.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">Specific skills (comma-separated)</label>
                <input
                  value={slot.skills}
                  onChange={(e) => updateSlot(slot.id, { skills: e.target.value })}
                  placeholder="e.g. React, TypeScript, PostgreSQL"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
                />
              </div>

              <p className="text-xs text-gray-400">
                ~${Math.round((MONTHLY_RATES[slot.role] ?? 4000) * (SENIORITY_MUL[slot.seniority] ?? 1)).toLocaleString()}/mo
              </p>
            </div>
          ))}

          <button
            onClick={addSlot}
            className="flex items-center gap-2 text-sm text-[#2E3192] hover:text-indigo-700 font-medium"
          >
            <span className="w-6 h-6 rounded-full border-2 border-[#2E3192] flex items-center justify-center text-lg leading-none">+</span>
            Add another role
          </button>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Project context, start date, time zone, methodologies…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="bg-[#0d0d2e] text-white rounded-xl p-5 space-y-3 sticky top-6">
            <h3 className="font-semibold text-sm">Team summary</h3>

            <div className="space-y-1.5">
              {slots.map((s) => (
                <div key={s.id} className="flex justify-between text-xs">
                  <span className="text-white/70">{s.role} ({s.seniority})</span>
                  <span>${Math.round((MONTHLY_RATES[s.role] ?? 4000) * (SENIORITY_MUL[s.seniority] ?? 1)).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 pt-3 flex justify-between">
              <span className="text-sm text-white/60">Est. monthly</span>
              <span className="text-lg font-bold">${Math.round(estimatedTotal).toLocaleString()}</span>
            </div>

            <p className="text-[10px] text-white/30">Rates in USD, subject to final agreement</p>

            <button
              onClick={() => mut.mutate()}
              disabled={mut.isPending || slots.length === 0}
              className="w-full py-2.5 bg-[#F7941D] text-white font-medium rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors text-sm"
            >
              {mut.isPending ? 'Submitting…' : 'Request This Team'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
