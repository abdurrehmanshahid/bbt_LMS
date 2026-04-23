const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json() as { message?: string; error?: string } & T;
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? 'Request failed');
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
