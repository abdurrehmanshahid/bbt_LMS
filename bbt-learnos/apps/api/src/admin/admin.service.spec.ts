import { BadRequestException } from '@nestjs/common';
import { EnrollmentPlan, EnrollmentStatus, UserRole } from '@prisma/client';

import { ClickHouseService } from '../analytics/clickhouse.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

import { AdminService } from './admin.service';

function makePrisma(): PrismaService {
  let prisma: Record<string, unknown>;
  prisma = {
    contentTag: {
      upsert: jest.fn().mockResolvedValue({ id: 'tag-1', name: 'AIChallenge', slug: 'aichallenge' }),
    },
    challenge: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({
        id: 'challenge-1',
        title: 'AI helper sprint',
        description: 'Build a short AI helper lesson.',
        startsAt: new Date('2026-05-27T00:00:00.000Z'),
        endsAt: null,
        isPinned: true,
      }),
    },
    $transaction: jest.fn(async (callback: (tx: PrismaService) => Promise<unknown>): Promise<unknown> =>
      callback(prisma as unknown as PrismaService),
    ),
  };

  return prisma as unknown as PrismaService;
}

function makeService(prisma = makePrisma()): AdminService {
  return new AdminService(
    prisma,
    { indexContent: jest.fn(), removeContent: jest.fn() } as unknown as SearchService,
    {} as unknown as ClickHouseService,
  );
}

describe('AdminService challenges', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('launches a pinned challenge and normalizes its hashtag', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);

    await expect(
      service.launchChallenge('admin-1', {
        title: 'AI helper sprint',
        hashtag: '#AI Challenge',
        description: 'Build a short AI helper lesson.',
      }),
    ).resolves.toMatchObject({
      id: 'challenge-1',
      tag: { slug: 'aichallenge' },
      isPinned: true,
    });

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith({
      where: { isPinned: true },
      data: { isPinned: false },
    });
  });

  it('rejects invalid challenge end dates', async () => {
    const service = makeService();

    await expect(
      service.launchChallenge('admin-1', {
        title: 'Bad challenge',
        hashtag: '#bad',
        startsAt: '2026-05-27T10:00:00.000Z',
        endsAt: '2026-05-27T09:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminService learner enrollment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function makeEnrollmentPrisma(): PrismaService {
    let prisma: Record<string, unknown>;
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'user-1', role: UserRole.LEARNER }),
        update: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
      track: {
        findUnique: jest.fn().mockResolvedValue({ id: 'track-1' }),
        update: jest.fn().mockResolvedValue({ id: 'track-1' }),
      },
      learnerProfile: {
        upsert: jest.fn().mockResolvedValue({ userId: 'user-1', currentTrackId: 'track-1' }),
      },
      enrollment: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          id: 'enrollment-1',
          plan: EnrollmentPlan.MONTHLY,
          status: EnrollmentStatus.ACTIVE,
          startDate: new Date('2026-05-29T00:00:00.000Z'),
          track: { id: 'track-1', title: 'Paid Track' },
        }),
      },
      $transaction: jest.fn(async (callback: (tx: PrismaService) => Promise<unknown>): Promise<unknown> =>
        callback(prisma as unknown as PrismaService),
      ),
    };

    return prisma as unknown as PrismaService;
  }

  it('defaults admin-assigned learner enrollments to monthly full access', async () => {
    const prisma = makeEnrollmentPrisma();
    const service = makeService(prisma);

    await expect(service.enrollUser('user-1', { trackId: 'track-1' })).resolves.toMatchObject({
      trackId: 'track-1',
      plan: EnrollmentPlan.MONTHLY,
      status: EnrollmentStatus.ACTIVE,
    });

    expect(prisma.enrollment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ plan: EnrollmentPlan.MONTHLY }),
        update: expect.objectContaining({ plan: EnrollmentPlan.MONTHLY }),
      }),
    );
  });
});
