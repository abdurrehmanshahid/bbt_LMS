import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export interface TalentSearchParams {
  track?: string;
  minBadgeScore?: number;
  country?: string;
  availability?: string;
  after?: string;
}

export interface PostOpportunityDto {
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
  isFeatured?: boolean;
}

export interface StaffAugDto {
  skills: string[];
  duration: string;
  startDate: string;
  maxHourlyBudget: number;
  currency?: string;
  notes?: string;
}

export interface HireTeamDto {
  roles: Array<{ role: string; skills: string[]; seniority: string }>;
  notes?: string;
}

const TEAM_RATE_MAP: Record<string, number> = {
  'Full Stack': 4500,
  Cloud: 5000,
  'UI/UX': 3800,
  Cybersecurity: 5500,
  'AI/ML': 6000,
  'ERP Developer': 4000,
  'Marketing/Sales': 3500,
};

@Injectable()
export class EmployerService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Talent search ───────────────────────────────────────────────────────────

  async searchTalent(params: TalentSearchParams) {
    const where: Record<string, unknown> = {
      role: 'LEARNER',
      isActive: true,
      learnerProfile: { isNot: null },
    };

    if (params.track) {
      where['learnerProfile'] = {
        ...(typeof where['learnerProfile'] === 'object' ? (where['learnerProfile'] as object) : {}),
        currentTrackId: { not: null },
      };
    }

    if (params.minBadgeScore) {
      where['skillBadges'] = {
        some: { score: { gte: params.minBadgeScore / 100 }, isRevoked: false },
      };
    }

    const learners = await this.prisma.user.findMany({
      where,
      take: 21,
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        updatedAt: true,
        learnerProfile: {
          select: { currentTrackId: true, absorptionStatus: true },
        },
        skillBadges: {
          where: { isRevoked: false },
          orderBy: { score: 'desc' },
          take: 3,
          select: {
            id: true,
            score: true,
            issuedAt: true,
            concept: { select: { title: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const hasMore = learners.length > 20;
    const items = learners.slice(0, 20).map((l) => ({
      id: l.id,
      displayName: l.name,
      avatarUrl: l.avatarUrl,
      trackId: l.learnerProfile?.currentTrackId ?? null,
      absorptionStatus: l.learnerProfile?.absorptionStatus ?? 'INELIGIBLE',
      lastActive: l.updatedAt.toISOString(),
      topBadges: l.skillBadges.map((b) => ({
        id: b.id,
        skill: b.concept.title,
        score: Math.round(b.score * 100),
        issuedAt: b.issuedAt.toISOString(),
      })),
    }));

    return {
      items,
      nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
    };
  }

  // ── Contact requests ────────────────────────────────────────────────────────

  async requestContact(employerId: string, learnerId: string, message?: string) {
    const learner = await this.prisma.user.findUnique({ where: { id: learnerId, role: 'LEARNER' } });
    if (!learner) throw new NotFoundException('Learner not found');

    const existing = await this.prisma.contactRequest.findUnique({
      where: { employerId_learnerId: { employerId, learnerId } },
    });
    if (existing) throw new ConflictException('Contact request already sent');

    const req = await this.prisma.contactRequest.create({
      data: {
        employerId,
        learnerId,
        ...(message ? { message } : {}),
      },
    });

    // In production: emit notification to learner
    return { id: req.id, status: req.status };
  }

  async getReferrals(_employerId: string) {
    // Return learners who are ELIGIBLE or UNDER_REVIEW for absorption
    // and were referred to this employer (simplified: return all eligible learners)
    const learners = await this.prisma.user.findMany({
      where: {
        role: 'LEARNER',
        learnerProfile: { absorptionStatus: { in: ['ELIGIBLE', 'UNDER_REVIEW', 'ABSORBED'] } },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        learnerProfile: { select: { absorptionStatus: true, currentTrackId: true } },
        skillBadges: {
          where: { isRevoked: false },
          take: 3,
          select: { id: true, score: true, concept: { select: { title: true } } },
        },
      },
      take: 20,
    });

    return learners.map((l) => ({
      id: l.id,
      name: l.name,
      avatarUrl: l.avatarUrl,
      absorptionStatus: l.learnerProfile?.absorptionStatus ?? 'INELIGIBLE',
      trackId: l.learnerProfile?.currentTrackId ?? null,
      topBadges: l.skillBadges.map((b) => ({
        skill: b.concept.title,
        score: Math.round(b.score * 100),
      })),
    }));
  }

  // ── Opportunities ───────────────────────────────────────────────────────────

  async postOpportunity(employerId: string, dto: PostOpportunityDto) {
    const data: Parameters<typeof this.prisma.opportunity.create>[0]['data'] = {
      employerId,
      title: dto.title,
      description: dto.description,
      track: dto.track,
      location: dto.location,
      isRemote: dto.isRemote,
      type: dto.type,
      ...(dto.salaryMin !== undefined ? { salaryMin: dto.salaryMin } : {}),
      ...(dto.salaryMax !== undefined ? { salaryMax: dto.salaryMax } : {}),
      ...(dto.currency ? { currency: dto.currency } : {}),
      ...(dto.closingDate ? { closingDate: new Date(dto.closingDate) } : {}),
      ...(dto.isFeatured ? { isFeatured: true } : {}),
    };

    const opp = await this.prisma.opportunity.create({ data });
    return { id: opp.id, status: 'PENDING_APPROVAL' };
  }

  async getOpportunities(params: { track?: string; type?: string; approved?: boolean }) {
    const where: Record<string, unknown> = {};
    if (params.track) where['track'] = params.track;
    if (params.type) where['type'] = params.type;
    if (params.approved !== undefined) where['isApproved'] = params.approved;

    return this.prisma.opportunity.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        track: true,
        location: true,
        isRemote: true,
        type: true,
        salaryMin: true,
        salaryMax: true,
        currency: true,
        closingDate: true,
        isFeatured: true,
        createdAt: true,
        employer: { select: { name: true } },
      },
    });
  }

  // ── Staff augmentation ──────────────────────────────────────────────────────

  async submitStaffAug(employerId: string, dto: StaffAugDto) {
    const req = await this.prisma.staffAugRequest.create({
      data: {
        employerId,
        skills: dto.skills,
        duration: dto.duration,
        startDate: new Date(dto.startDate),
        maxHourlyBudget: dto.maxHourlyBudget,
        ...(dto.currency ? { currency: dto.currency } : {}),
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
    });
    return { id: req.id, status: req.status };
  }

  async getStaffAugRequests(employerId: string) {
    return this.prisma.staffAugRequest.findMany({
      where: { employerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Hire-a-Team ─────────────────────────────────────────────────────────────

  async submitHireTeam(employerId: string, dto: HireTeamDto) {
    const req = await this.prisma.hireTeamRequest.create({
      data: {
        employerId,
        roles: dto.roles,
        ...(dto.notes ? { notes: dto.notes } : {}),
      },
    });

    const estimatedMonthly = dto.roles.reduce((sum, r) => {
      const base = TEAM_RATE_MAP[r.role] ?? 4000;
      const seniorityMul = r.seniority === 'senior' ? 1.4 : r.seniority === 'mid' ? 1.1 : 1;
      return sum + base * seniorityMul;
    }, 0);

    return { id: req.id, status: req.status, estimatedMonthly: Math.round(estimatedMonthly) };
  }

  // ── Badge verification ──────────────────────────────────────────────────────

  async verifyBadge(badgeId: string) {
    const badge = await this.prisma.skillBadge.findUnique({
      where: { id: badgeId },
      include: {
        learner: { select: { name: true } },
        concept: { select: { title: true } },
      },
    });

    if (!badge) throw new NotFoundException('Badge not found');

    return {
      valid: !badge.isRevoked,
      badgeId: badge.id,
      skill: badge.concept.title,
      holder: badge.learner.name,
      score: Math.round(badge.score * 100),
      issuedAt: badge.issuedAt.toISOString(),
      isRevoked: badge.isRevoked,
    };
  }
}
