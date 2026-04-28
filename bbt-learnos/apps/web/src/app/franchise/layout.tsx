'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/franchise/dashboard', label: '📊 Dashboard' },
  { href: '/franchise/learners',  label: '👥 Learners' },
  { href: '/franchise/compliance', label: '✅ Compliance' },
];

export default function FranchiseLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const [franchiseName, setFranchiseName] = useState('');

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    fetch(`${API}/franchise/dashboard`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { franchise?: { name?: string } }) => setFranchiseName(d.franchise?.name ?? ''))
      .catch(() => undefined);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-slate-800 bg-[#0d0d2e] px-4 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-500">Franchise</p>
          {franchiseName && (
            <p className="mt-1 font-semibold text-white truncate">{franchiseName}</p>
          )}
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? 'bg-[#2E3192] text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 bg-[#0d0d2e] px-8 py-8">{children}</main>
    </div>
  );
}
