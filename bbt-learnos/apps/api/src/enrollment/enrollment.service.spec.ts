import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentPlan, EnrollmentStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { EnrollmentService } from './enrollment.service';

const mockTrack = {
  id: 'track-uuid',
  slug: 'full-stack-web-development',
};

const makeConfig = (values: Record<string, string> = {}) =>
  ({
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback ?? ''),
  }) as unknown as ConfigService;

const makePrisma = () => {
  const tx = {
    enrollment: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }: { data: { plan: EnrollmentPlan } }) => Promise.resolve({
        id: 'enrollment-uuid',
        learnerId: 'user-uuid',
        trackId: mockTrack.id,
        plan: data.plan,
        status: EnrollmentStatus.ACTIVE,
      })),
      update: jest.fn().mockResolvedValue({
        id: 'enrollment-uuid',
        learnerId: 'user-uuid',
        trackId: mockTrack.id,
        plan: EnrollmentPlan.MONTHLY,
        status: EnrollmentStatus.ACTIVE,
      }),
    },
    track: {
      update: jest.fn().mockResolvedValue(mockTrack),
    },
    learnerProfile: {
      upsert: jest.fn().mockResolvedValue({ userId: 'user-uuid', currentTrackId: mockTrack.id }),
    },
  };

  return {
    tx,
    prisma: {
      track: {
        findUnique: jest.fn().mockResolvedValue(mockTrack),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'learner@bbt.edu.pk' }),
      },
      enrollment: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn().mockResolvedValue({
          id: 'payment-uuid',
          gatewayTransactionId: 'BBT-EASYPAISA-ref',
        }),
        update: jest.fn().mockResolvedValue({ id: 'payment-uuid' }),
      },
      $transaction: jest.fn((callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
      ),
    } as unknown as PrismaService,
  };
};

describe('EnrollmentService', () => {
  const eventEmitter = {
    emit: jest.fn(),
  } as unknown as EventEmitter2;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs when Stripe is not configured', () => {
    const { prisma } = makePrisma();

    expect(() => new EnrollmentService(prisma, makeConfig(), eventEmitter)).not.toThrow();
  });

  it('enrolls learners in free tracks without requiring Stripe configuration', async () => {
    const { prisma, tx } = makePrisma();
    const service = new EnrollmentService(prisma, makeConfig(), eventEmitter);

    await expect(service.enrollFree('user-uuid', mockTrack.id)).resolves.toMatchObject({
      learnerId: 'user-uuid',
      trackId: mockTrack.id,
      plan: EnrollmentPlan.FREE,
      status: EnrollmentStatus.ACTIVE,
    });

    expect(tx.track.update).toHaveBeenCalledWith({
      where: { id: mockTrack.id },
      data: { enrollmentCount: { increment: 1 } },
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('enrollment.created', {
      userId: 'user-uuid',
      trackId: mockTrack.id,
    });
  });

  it('returns a standardised error when paid checkout is requested without Stripe config', async () => {
    const { prisma } = makePrisma();
    const service = new EnrollmentService(prisma, makeConfig(), eventEmitter);

    await expect(
      service.createCheckoutSession('user-uuid', mockTrack.id, 'MONTHLY'),
    ).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Stripe payment provider is not configured',
        field: 'STRIPE_SECRET_KEY',
      },
    });
  });

  it('grants sponsored full access without Stripe configuration', async () => {
    const { prisma, tx } = makePrisma();
    prisma.user.findUnique = jest.fn().mockResolvedValue({ email: 'abdurrehman545@gmail.com' });
    const service = new EnrollmentService(prisma, makeConfig(), eventEmitter);

    await expect(
      service.createCheckoutSession('user-uuid', mockTrack.id, 'MONTHLY'),
    ).resolves.toEqual({
      url: `http://localhost:3000/enroll/success?trackId=${mockTrack.id}`,
    });

    expect(tx.enrollment.create).toHaveBeenCalledWith({
      data: {
        learnerId: 'user-uuid',
        trackId: mockTrack.id,
        plan: EnrollmentPlan.MONTHLY,
        status: EnrollmentStatus.ACTIVE,
        stripeSubscriptionId: null,
      },
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith('enrollment.created', {
      userId: 'user-uuid',
      trackId: mockTrack.id,
    });
  });

  it('returns a standardised error when JazzCash config is missing', async () => {
    const { prisma } = makePrisma();
    const service = new EnrollmentService(prisma, makeConfig(), eventEmitter);

    await expect(
      service.createJazzCashCheckout('user-uuid', mockTrack.id, 'MONTHLY'),
    ).rejects.toMatchObject({
      response: {
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        field: 'JAZZCASH_MERCHANT_ID',
      },
    });
  });

  it('creates an EasyPaisa OTC pending payment with retailer instructions', async () => {
    const { prisma } = makePrisma();
    const service = new EnrollmentService(
      prisma,
      makeConfig({
        EASYPAISA_STORE_ID: 'store-123',
        EASYPAISA_INTEGRITY_SALT: 'secret',
      }),
      eventEmitter,
    );

    const checkout = await service.createEasyPaisaCheckout('user-uuid', mockTrack.id, 'MONTHLY', 'OTC');

    expect(checkout.gateway).toBe('EASYPAISA');
    expect(checkout.amount).toBe(2999);
    expect(checkout.instructions).toMatchObject({
      method: 'OTC',
      amount: 2999,
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-uuid',
        amount: 2999,
        currency: 'PKR',
        gateway: 'EASYPAISA',
        status: 'PENDING',
      }),
    });
  });
});
