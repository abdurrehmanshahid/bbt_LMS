'use client';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/admin';
import type { UserRow, UserDetail, SuspendDuration } from '@/lib/admin';

const ROLE_COLOR: Record<string, string> = {
  ADMIN: 'bg-orange-900/40 text-orange-300',
  CREATOR: 'bg-indigo-900/40 text-indigo-300',
  LEARNER: 'bg-navy-700 text-navy-300',
};

const SUSPEND_DURATIONS: SuspendDuration[] = [7, 14, 30, 60];

function UserDetailPanel({
  userId,
  token,
  onClose,
}: {
  userId: string;
  token: string;
  onClose: () => void;
}): React.JSX.Element {
  const qc = useQueryClient();
  const [suspendDays, setSuspendDays] = useState<SuspendDuration>(7);
  const [actionMsg, setActionMsg] = useState('');

  const { data, isLoading } = useQuery<UserDetail>({
    queryKey: ['admin-user', userId],
    queryFn: () => adminApi.getUserDetail(token, userId),
  });

  const actionMut = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      adminApi.userAction(token, userId, action, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: ['admin-user', userId] });
      setActionMsg('Action applied.');
      setTimeout(() => setActionMsg(''), 3000);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-navy-700 bg-navy-900 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-700 shrink-0">
          <h2 className="font-semibold text-white">User Detail</h2>
          <button type="button" onClick={onClose} className="text-navy-400 hover:text-white transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-xl bg-navy-800 animate-pulse" />)}
            </div>
          ) : data ? (
            <>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{data.name}</p>
                  <p className="text-sm text-navy-400">{data.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${ROLE_COLOR[data.role] ?? 'bg-navy-700 text-navy-300'}`}>
                      {data.role}
                    </span>
                    {!data.isActive && (
                      <span className="rounded-full bg-red-900/40 px-2 py-0.5 text-xs font-mono text-red-400">Suspended</span>
                    )}
                    {!data.emailVerified && (
                      <span className="rounded-full bg-yellow-900/40 px-2 py-0.5 text-xs font-mono text-yellow-400">Unverified</span>
                    )}
                  </div>
                </div>
                <p className="text-xs font-mono text-navy-500 shrink-0">
                  Joined {new Date(data.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Enrollments */}
              {data.enrollments.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Enrollments</p>
                  <div className="space-y-1">
                    {data.enrollments.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-800">
                        <span className="text-navy-300">{e.trackTitle}</span>
                        <div className="flex gap-2 text-xs font-mono">
                          <span className="text-navy-500">{e.plan}</span>
                          <span className={`${e.status === 'ACTIVE' ? 'text-green-400' : 'text-navy-500'}`}>{e.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payments */}
              {data.payments.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Payments</p>
                  <div className="space-y-1">
                    {data.payments.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-800">
                        <div className="flex gap-2 text-xs font-mono">
                          <span className="text-navy-500">{new Date(p.createdAt).toLocaleDateString()}</span>
                          <span className="text-navy-400">{p.gateway}</span>
                        </div>
                        <div className="flex gap-2 text-xs font-mono">
                          <span className="text-white">{p.amount.toLocaleString()} {p.currency}</span>
                          <span className={p.status === 'PAID' ? 'text-green-400' : 'text-yellow-400'}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation history */}
              {data.moderationInteractions.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-navy-400 uppercase tracking-wider mb-2">Moderation History</p>
                  <div className="space-y-1">
                    {data.moderationInteractions.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-navy-800">
                        <span className="text-navy-300 text-xs truncate max-w-[200px]">{m.contentTitle}</span>
                        <div className="flex gap-2 text-xs font-mono shrink-0">
                          <span className={m.decision === 'APPROVED' ? 'text-green-400' : m.decision === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}>
                            {m.decision}
                          </span>
                          <span className="text-navy-500">{new Date(m.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="rounded-xl bg-navy-950 border border-navy-700 p-4 space-y-3">
                <p className="text-xs font-mono text-navy-400 uppercase tracking-wider">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => actionMut.mutate({ action: 'WARN' })}
                    disabled={actionMut.isPending}
                    className="rounded-lg border border-yellow-700 px-3 py-1.5 text-xs font-semibold text-yellow-400 hover:bg-yellow-900/30 disabled:opacity-50 transition-colors"
                  >
                    Warn
                  </button>
                  <div className="flex items-center gap-1">
                    <select
                      value={suspendDays}
                      onChange={(e) => setSuspendDays(Number(e.target.value) as SuspendDuration)}
                      className="rounded-lg border border-navy-600 bg-navy-800 text-white text-xs px-2 py-1.5"
                    >
                      {SUSPEND_DURATIONS.map((d) => (
                        <option key={d} value={d}>{d}d</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => actionMut.mutate({ action: 'SUSPEND', payload: { days: suspendDays } })}
                      disabled={actionMut.isPending}
                      className="rounded-lg border border-orange-700 px-3 py-1.5 text-xs font-semibold text-orange-400 hover:bg-orange-900/30 disabled:opacity-50 transition-colors"
                    >
                      Suspend
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => actionMut.mutate({ action: 'BAN' })}
                    disabled={actionMut.isPending}
                    className="rounded-lg border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                  >
                    Ban
                  </button>
                  {!data.isActive && (
                    <button
                      type="button"
                      onClick={() => actionMut.mutate({ action: 'REINSTATE' })}
                      disabled={actionMut.isPending}
                      className="rounded-lg border border-green-700 px-3 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-900/30 disabled:opacity-50 transition-colors"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
                {actionMsg && <p className="text-xs text-green-400">{actionMsg}</p>}
                {actionMut.isError && <p className="text-xs text-red-400">Action failed. Please retry.</p>}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function UsersPage(): React.JSX.Element {
  const { accessToken } = useAuthStore();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const params = useCallback(() => {
    const p: Record<string, string> = { page: String(page), limit: '20' };
    if (search) p['search'] = search;
    if (role) p['role'] = role;
    if (status) p['status'] = status;
    return p;
  }, [search, role, status, page]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, status, page],
    queryFn: () => adminApi.getUsers(accessToken!, params()),
    enabled: !!accessToken,
  });

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-white">Users</h1>
        <p className="text-sm text-navy-400 mt-1">Search and manage platform users.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name or email…"
          className="rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500 min-w-[220px]"
        />
        <select
          value={role}
          onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500"
        >
          <option value="">All roles</option>
          <option value="LEARNER">Learner</option>
          <option value="CREATOR">Creator</option>
          <option value="ADMIN">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-lg border border-navy-600 bg-navy-800 text-white text-sm px-3 py-2 focus:outline-none focus:border-orange-500"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {data && (
          <span className="ml-auto text-xs font-mono text-navy-500 self-center">{data.total.toLocaleString()} total</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-xl bg-navy-800 h-12 animate-pulse" />)}
        </div>
      ) : data?.rows.length === 0 ? (
        <div className="rounded-2xl border border-navy-700 bg-navy-800 p-10 text-center">
          <p className="text-navy-400">No users match your filters.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-navy-700 bg-navy-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-navy-700">
                  <tr>
                    {['Name', 'Email', 'Role', 'Track', 'Status', 'Joined', ''].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-mono text-navy-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700">
                  {data?.rows.map((row: UserRow) => (
                    <tr key={row.id} className="hover:bg-navy-750 transition-colors">
                      <td className="px-4 py-3 font-medium text-white">{row.name}</td>
                      <td className="px-4 py-3 text-navy-400 font-mono text-xs">{row.email}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-mono ${ROLE_COLOR[row.role] ?? 'bg-navy-700 text-navy-300'}`}>
                          {row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-navy-400 text-xs">{row.enrolledTrack ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-mono ${row.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {row.isActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-navy-500 text-xs whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedUserId(row.id)}
                          className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-navy-600 px-4 py-2 text-sm text-navy-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Previous
              </button>
              <p className="text-xs font-mono text-navy-500">Page {page} of {totalPages}</p>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-navy-600 px-4 py-2 text-sm text-navy-400 hover:text-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {selectedUserId && (
        <UserDetailPanel
          userId={selectedUserId}
          token={accessToken!}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </div>
  );
}
