// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API: string = (globalThis as any)?.process?.env?.['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

export async function authedFetch<T>(
  path: string,
  token: string,
  params?: Record<string, string>,
): Promise<T> {
  const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
  const res = await fetch(`${API}${path}${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function authedPost<T>(
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}
