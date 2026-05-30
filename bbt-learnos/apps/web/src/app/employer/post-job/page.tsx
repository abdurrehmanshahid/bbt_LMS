'use client';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import { postOpportunity } from '@/lib/employer';
import { useAuthStore } from '@/lib/store';

const TRACKS = [
  'GenAI + Agentic AI',
  'Cloud + MLOps',
  'Odoo ERP Development',
  'AI-Integrated Full Stack',
  'Cybersecurity',
  'UI/UX + Brand Design',
  'AI Marketing + Sales',
];

const JOB_TYPES = ['full-time', 'contract', 'internship'];

export default function PostJobPage(): React.JSX.Element {
  const router = useRouter();
  const token = useAuthStore((s) => s.accessToken);

  const [form, setForm] = useState({
    title: '',
    description: '',
    track: TRACKS[0],
    location: '',
    isRemote: false,
    type: 'full-time',
    salaryMin: '',
    salaryMax: '',
    currency: 'USD',
    closingDate: '',
  });

  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: () =>
      postOpportunity(
        {
          title: form.title,
          description: form.description,
          track: form.track,
          location: form.location,
          isRemote: form.isRemote,
          type: form.type,
          ...(form.salaryMin ? { salaryMin: parseFloat(form.salaryMin) } : {}),
          ...(form.salaryMax ? { salaryMax: parseFloat(form.salaryMax) } : {}),
          ...(form.currency ? { currency: form.currency } : {}),
          ...(form.closingDate ? { closingDate: form.closingDate } : {}),
        },
        token!,
      ),
    onSuccess: () => {
      router.push('/employer/talent');
    },
    onError: (e: Error) => setError(e.message),
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0d0d2e]">Post a Job</h1>
        <p className="text-sm text-gray-500 mt-1">Submitted opportunities are reviewed before going live</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
          <input
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Full Stack Developer"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Track</label>
          <select
            value={form.track}
            onChange={(e) => set('track', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
          >
            {TRACKS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={form.type}
              onChange={(e) => set('type', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            >
              {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              value={form.location}
              onChange={(e) => set('location', e.target.value)}
              placeholder="e.g. Lahore / Remote"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isRemote}
            onChange={(e) => set('isRemote', e.target.checked)}
            className="rounded border-gray-300 text-[#2E3192] focus:ring-[#2E3192]"
          />
          <span className="text-sm text-gray-700">Remote-friendly</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            rows={5}
            placeholder="Describe the role, responsibilities, and requirements…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min salary</label>
            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) => set('salaryMin', e.target.value)}
              placeholder="e.g. 2000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max salary</label>
            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) => set('salaryMax', e.target.value)}
              placeholder="e.g. 4000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select
              value={form.currency}
              onChange={(e) => set('currency', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
            >
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
              <option value="AED">AED</option>
              <option value="SAR">SAR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Closing date (optional)</label>
          <input
            type="date"
            value={form.closingDate}
            onChange={(e) => set('closingDate', e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3192]"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !form.title || !form.description || !form.location}
          className="w-full py-2.5 bg-[#F7941D] text-white font-medium rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors"
        >
          {mut.isPending ? 'Submitting…' : 'Submit for Review'}
        </button>
      </div>
    </div>
  );
}
