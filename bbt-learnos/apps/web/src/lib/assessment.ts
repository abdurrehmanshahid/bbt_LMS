const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api';

async function authedFetch<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function authedPost<T>(path: string, token: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string; code?: string };
    throw Object.assign(new Error(err.message ?? 'Request failed'), { code: err.code });
  }
  return res.json() as Promise<T>;
}

export type QuestionType = 'MCQ' | 'CODE';

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  codeSnippet: string | null;
  codeLanguage: string | null;
  options: Array<{ id: string; text: string }>;
}

export interface AssessmentSession {
  sessionId: string;
  moduleId: string;
  moduleTitle: string;
  passingScore: number;
  questions: Question[];
  startedAt: string;
}

export interface MissedConcept {
  conceptTitle: string;
  resourceSlug: string | null;
}

export interface AssessmentResult {
  score: number;
  passed: boolean;
  attemptNumber: number;
  badge: SkillBadge | null;
  missedConcepts: MissedConcept[];
  retryAvailableAt: string | null;
  percentile: number | null;
}

export interface SkillBadge {
  id: string;
  conceptTitle: string;
  trackTitle: string;
  issuedAt: string;
  score: number;
  verificationUrl: string;
  badgeJson: Record<string, unknown>;
}

export interface PortfolioData {
  user: { name: string; avatarUrl: string | null; username: string };
  badges: SkillBadge[];
  projects: Array<{
    id: string;
    title: string;
    url: string;
    type: 'github' | 'live' | 'file';
    trackTitle: string;
    submittedAt: string;
  }>;
  topTrack: string | null;
  assessmentPercentile: number | null;
  absorptionScore: number | null;
  absorptionStatus: string | null;
  absorptionBreakdown: {
    badges: number;
    projects: number;
    assessments: number;
    cohort: number;
  } | null;
}

export const assessmentApi = {
  startSession: (token: string, moduleId: string) =>
    authedPost<AssessmentSession>('/assessment/start', token, { moduleId }),

  submitAnswers: (
    token: string,
    moduleId: string,
    answers: Record<string, string>,
    sessionId: string,
  ) =>
    authedPost<AssessmentResult>('/assessment/submit', token, { moduleId, answers, sessionId }),

  getPortfolio: (username: string) =>
    authedFetch<PortfolioData>(`/learner/portfolio/${username}`, ''),

  getMyPortfolio: (token: string) =>
    authedFetch<PortfolioData>('/learner/portfolio/me', token),
};
