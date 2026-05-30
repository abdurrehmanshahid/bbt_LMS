'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

const NAV = [
  { href: '/franchise/dashboard', label: 'Dashboard' },
  { href: '/franchise/learners', label: 'Learners' },
  { href: '/franchise/compliance', label: 'Compliance' },
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
    <div className="flex min-h-screen bbt-screen">
      <aside className="w-60 shrink-0 border-r bbt-sidebar px-4 py-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest bbt-muted">Franchise</p>
          {franchiseName && (
            <p className="mt-1 truncate font-semibold bbt-title">{franchiseName}</p>
          )}
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                pathname === item.href ? 'bbt-chip-active' : 'bbt-nav-pill'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
