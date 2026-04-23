import { apiFetch, apiPost } from './api';

export interface TalentCard {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  trackId: string | null;
  absorptionStatus: string;
  lastActive: string;
  topBadges: { id: string; skill: string; score: number; issuedAt: string }[];
}

export interface TalentPage {
  items: TalentCard[];
  nextCursor: string | null;
}

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  track: string;
  location: string;
  isRemote: boolean;
  type: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  closingDate: string | null;
  isFeatured: boolean;
  createdAt: string;
  employer: { name: string };
}

export interface StaffAugRequest {
  id: string;
  skills: string[];
  duration: string;
  startDate: string;
  maxHourlyBudget: number;
  currency: string;
  status: string;
  notes: string | null;
  createdAt: string;
}

// ── Talent search ─────────────────────────────────────────────────────────────

export async function searchTalent(
  params: {
    track?: string;
    minBadgeScore?: number;
    after?: string;
  },
  token: string,
): Promise<TalentPage> {
  const qs = new URLSearchParams();
  if (params.track) qs.set('track', params.track);
  if (params.minBadgeScore) qs.set('minBadgeScore', String(params.minBadgeScore));
  if (params.after) qs.set('after', params.after);
  return apiFetch(`/employer/talent?${qs.toString()}`, token);
}

export async function requestContact(
  learnerId: string,
  message: string | undefined,
  token: string,
): Promise<{ id: string; status: string }> {
  return apiPost(`/employer/contact-request/${learnerId}`, { message }, token);
}

export async function getReferrals(token: string) {
  return apiFetch('/employer/referrals', token);
}

// ── Opportunities ─────────────────────────────────────────────────────────────

export async function postOpportunity(
  data: {
    title: string;
    description: string;
    track: string;
    location: string;
    isRemote: boolean;
    type: string;
    salaryMin?: number;
    salaryMax?: number;
    currency?: string;
    closingDate?: string;
  },
  token: string,
): Promise<{ id: string; status: string }> {
  return apiPost('/employer/opportunities', data, token);
}

export async function getOpportunities(params?: {
  track?: string;
  type?: string;
  approved?: boolean;
}): Promise<Opportunity[]> {
  const qs = new URLSearchParams();
  if (params?.track) qs.set('track', params.track);
  if (params?.type) qs.set('type', params.type);
  if (params?.approved !== undefined) qs.set('approved', String(params.approved));
  return apiFetch(`/employer/opportunities?${qs.toString()}`);
}

// ── Staff augmentation ────────────────────────────────────────────────────────

export async function submitStaffAug(
  data: {
    skills: string[];
    duration: string;
    startDate: string;
    maxHourlyBudget: number;
    currency?: string;
    notes?: string;
  },
  token: string,
): Promise<{ id: string; status: string }> {
  return apiPost('/employer/staff-aug', data, token);
}

export async function getStaffAugRequests(token: string): Promise<StaffAugRequest[]> {
  return apiFetch('/employer/staff-aug', token);
}

// ── Hire-a-Team ───────────────────────────────────────────────────────────────

export async function submitHireTeam(
  data: {
    roles: Array<{ role: string; skills: string[]; seniority: string }>;
    notes?: string;
  },
  token: string,
): Promise<{ id: string; status: string; estimatedMonthly: number }> {
  return apiPost('/employer/hire-team', data, token);
}

// ── Badge verification (public) ───────────────────────────────────────────────

export async function verifyBadge(badgeId: string) {
  return apiFetch(`/badges/${badgeId}/verify`);
}
