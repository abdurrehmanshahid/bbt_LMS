const API = normalizeApiBase(process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api');

function normalizeApiBase(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  emailVerified?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

function hasCode(value: unknown): value is { code: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    typeof (value as Record<string, unknown>)['code'] === 'string'
  );
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json() as { message?: unknown; error?: string; code?: string } & T;
  if (!res.ok) {
    const raw = data.message;
    const msg =
      typeof raw === 'string'
        ? raw
        : hasCode(raw)
          ? raw.code
          : typeof data.code === 'string'
            ? data.code
          : typeof raw === 'object'
            ? JSON.stringify(raw)
            : 'Request failed';
    throw new Error(msg);
  }
  return data;
}

export const authApi = {
  signup: (body: { name: string; email: string; password: string; role?: string }) =>
    post<AuthResponse>('/auth/signup', body),

  login: (body: { email: string; password: string; rememberMe?: boolean }) =>
    post<AuthResponse>('/auth/login', body),

  forgotPassword: (email: string) =>
    post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    post<{ message: string }>('/auth/reset-password', { token, password }),

  submitQuiz: (answers: Record<string, string>) =>
    post<{ recommendedTrack: { id: string; slug: string; title: string; icon: string; description: string } }>(
      '/learner/onboarding/quiz',
      { answers },
    ),
};
