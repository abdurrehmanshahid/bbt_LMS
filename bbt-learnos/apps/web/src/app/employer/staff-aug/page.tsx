'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { submitStaffAug, getStaffAugRequests, type StaffAugRequest } from '@/lib/employer';

const DURATIONS = ['1_week', '1_month', '3_months', 'ongoing'];
const DURATION_LABEL: Record<string, string> = {
  '1_week': '1 Week',
  '1_month': '1 Month',
  '3_months': '3 Months',
  'ongoing': 'Ongoing',
};
const STATUS_COLOR: Record<string, string> = {
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  MATCHING: 'bg-blue-100 text-blue-700',
  PROFILES_SENT: 'bg-indigo-100 text-indigo-700',
  AGREED: 'bg-green-100 text-green-700',
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-600',
};

const SKILL_SUGGESTIONS = [
  'React', 'Next.js', 'Node.js', 'Python', 'FastAPI', 'PostgreSQL',
  'Kubernetes', 'AWS', 'Odoo', 'TypeScript', 'Cybersecurity', 'Figma',
];

export default function StaffAugPage(): React.JSX.Element {
  const token = useAuthStore((s) => s.accessToken);
  const qc = useQueryClient();

  const [skillInput, setSkillInput] = useState('');
  const [form, setForm] = useState({
    skills: [] as string[],
    duration: '1_month',
    startDate: '',
    maxHourlyBudget: '',
    currency: 'USD',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { data: requests } = useQuery<StaffAugRequest[]>({
    queryKey: ['staff-aug-requests'],
    queryFn: () => getStaffAugRequests(token!),
    enabled: !!token,
  });

  const mut = useMutation({
    mutationFn: () =>
      submitStaffAug(
        {
          skills: form.skills,
          duration: form.duration,
          startDate: form.startDate,
          maxHourlyBudget: parseFloat(form.maxHourlyBudget),
          currency: form.currency,
          ...(form.notes ? { notes: form.notes } : {}),
        },
        token!,
      ),
    onSuccess: () => {
      setSubmitted(true);
      void qc.invalidateQueries({ queryKey: ['staff-aug-requests'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const addSkill = (skill: string) => {
    const s = skill.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0d0d2e]">Staff Augmentation</h1>
        <p className="text-sm text-gray-500 mt-1">Request vetted developers on short or long-term engagements</p>
      </div>

      {submitted ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center space-y-2">
          <p className="text-green-700 font-semibold text-lg">Request submitted!</p>
          <p className="text-sm text-green-600">Our team will match profiles within 48 hours.</p>
          <button
            onClick={() => { setSubmitted(false); setForm({ skills: [], duration: '1_month', startDate: '', maxHourlyBudget: '', currency: 'USD', notes: '' }); }}
            className="mt-3 text-sm text-[#2E3192] underline"
          >
            Submit another request
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required skills</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.skills.map((s) => (
                <span key={s} className="flex items-center gap-1 bg-indigo-50 text-[#2E3192] text-xs px-2.5 py-1 rounded-full">
                  {s}
                  <button onClick={() => removeSkill(s)} className="text-indigo-300 hover:text-indigo-600">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); } }}
                placeholder="Type skill and press Enter"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
              />
              <button
                onClick={() => addSkill(skillInput)}
                className="px-3 py-2 bg-[#0d0d2e] text-white rounded-lg text-sm"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s)).map((s) => (
                <button
                  key={s}
                  onClick={() => addSkill(s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-[#2E3192] hover:text-[#2E3192]"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={form.duration}
                onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
              >
                {DURATIONS.map((d) => <option key={d} value={d}>{DURATION_LABEL[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max hourly budget</label>
              <input
                type="number"
                value={form.maxHourlyBudget}
                onChange={(e) => setForm((f) => ({ ...f, maxHourlyBudget: e.target.value }))}
                placeholder="e.g. 35"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
              >
                <option value="USD">USD</option>
                <option value="PKR">PKR</option>
                <option value="AED">AED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              placeholder="Project context, time zone preferences, specific certifications…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || form.skills.length === 0 || !form.startDate || !form.maxHourlyBudget}
            className="w-full py-2.5 bg-[#F7941D] text-white font-medium rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors"
          >
            {mut.isPending ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      )}

      {/* Past requests */}
      {requests && requests.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[#0d0d2e]">Your requests</h2>
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0d0d2e]">{r.skills.join(', ')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {DURATION_LABEL[r.duration] ?? r.duration} · up to {r.maxHourlyBudget} {r.currency}/hr
                  </p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
