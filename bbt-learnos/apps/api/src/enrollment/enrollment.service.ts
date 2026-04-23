import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EnrollmentPlan, EnrollmentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';

// Local interfaces for Stripe webhook payloads (avoids StripeConstructor namespace resolution issues)
interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}
interface StripeCheckoutSession {
  id: string;
  subscription: string | null;
  payment_intent: string | null;
  amount_total: number | null;
  currency: string | null;
}
interface StripeSub {
  id: string;
  metadata: Record<string, string>;
}
interface StripeInvoice {
  subscription: string | { id: string } | null;
}

const PLAN_PRICE_IDS: Record<'MONTHLY' | 'ANNUAL', string> = {
  MONTHLY: '',
  ANNUAL: '',
};

@Injectable()
export class EnrollmentService {
  // Use InstanceType so the class and namespace don't conflict
  private readonly stripe: InstanceType<typeof Stripe>;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2026-03-25.dahlia',
    });
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    PLAN_PRICE_IDS.MONTHLY = this.config.get<string>('STRIPE_MONTHLY_PRICE_ID', '');
    PLAN_PRICE_IDS.ANNUAL = this.config.get<string>('STRIPE_ANNUAL_PRICE_ID', '');
  }

  // ─── Free enrollment ─────────────────────────────────────────────────────────

  async enrollFree(userId: string, trackId: string) {
    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) throw new NotFoundException('Track not found');

    const existing = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
    });
    if (existing) throw new ConflictException('Already enrolled in this track');

    const enrollment = await this.prisma.$transaction(async (tx) => {
      const enroll = await tx.enrollment.create({
        data: {
          learnerId: userId,
          trackId,
          plan: EnrollmentPlan.FREE,
          status: EnrollmentStatus.ACTIVE,
        },
      });
      await tx.track.update({
        where: { id: trackId },
        data: { enrollmentCount: { increment: 1 } },
      });
      await tx.learnerProfile.upsert({
        where: { userId },
        create: { userId, currentTrackId: trackId },
        update: { currentTrackId: trackId },
      });
      return enroll;
    });

    this.eventEmitter.emit('enrollment.created', { userId, trackId });
    return enrollment;
  }

  // ─── Paid enrollment (Stripe checkout) ───────────────────────────────────────

  async createCheckoutSession(
    userId: string,
    trackId: string,
    plan: 'MONTHLY' | 'ANNUAL',
  ): Promise<{ url: string }> {
    const [track, user] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);
    if (!track) throw new NotFoundException('Track not found');
    if (!user) throw new NotFoundException('User not found');

    const userEmail = user.email;
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) throw new BadRequestException(`Price not configured for plan ${plan}`);

    // Find or create Stripe customer
    let customerId: string;
    const existing = await this.stripe.customers.list({ email: userEmail, limit: 1 });
    if (existing.data.length > 0 && existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const customer = await this.stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL')}/enroll/success?trackId=${trackId}`,
      cancel_url: `${this.config.get('FRONTEND_URL')}/tracks/${track.slug}`,
      subscription_data: {
        metadata: { userId, trackId, plan },
      },
    });

    return { url: session.url! };
  }

  // ─── Cancel enrollment ───────────────────────────────────────────────────────

  async cancel(userId: string, trackId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.stripeSubscriptionId) {
      await this.stripe.subscriptions.cancel(enrollment.stripeSubscriptionId);
    }

    return this.prisma.enrollment.update({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
      data: { status: EnrollmentStatus.CANCELLED },
    });
  }

  // ─── List enrollments ─────────────────────────────────────────────────────────

  async findByUser(userId: string) {
    return this.prisma.enrollment.findMany({
      where: { learnerId: userId },
      include: {
        track: {
          select: {
            id: true,
            slug: true,
            title: true,
            icon: true,
            trackNumber: true,
          },
        },
      },
    });
  }

  // ─── Stripe webhook ──────────────────────────────────────────────────────────

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: StripeEvent;
    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret) as unknown as StripeEvent;
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as StripeCheckoutSession;
        await this.handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as unknown as StripeSub;
        await this.handleSubscriptionDeleted(sub);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as unknown as StripeInvoice;
        await this.handlePaymentFailed(invoice);
        break;
      }
    }
  }

  private async handleCheckoutCompleted(session: StripeCheckoutSession): Promise<void> {
    const subscriptionId = session.subscription as string;
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    const { userId, trackId, plan } = subscription.metadata as {
      userId: string;
      trackId: string;
      plan: 'MONTHLY' | 'ANNUAL';
    };

    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) return;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.enrollment.findUnique({
        where: { learnerId_trackId: { learnerId: userId, trackId } },
      });

      if (existing) {
        await tx.enrollment.update({
          where: { learnerId_trackId: { learnerId: userId, trackId } },
          data: {
            plan: EnrollmentPlan[plan],
            status: EnrollmentStatus.ACTIVE,
            stripeSubscriptionId: subscriptionId,
          },
        });
      } else {
        await tx.enrollment.create({
          data: {
            learnerId: userId,
            trackId,
            plan: EnrollmentPlan[plan],
            status: EnrollmentStatus.ACTIVE,
            stripeSubscriptionId: subscriptionId,
          },
        });
        await tx.track.update({
          where: { id: trackId },
          data: { enrollmentCount: { increment: 1 } },
        });
        await tx.learnerProfile.upsert({
          where: { userId },
          create: { userId, currentTrackId: trackId },
          update: { currentTrackId: trackId },
        });
      }

      await tx.payment.create({
        data: {
          userId,
          amount: (session.amount_total ?? 0) / 100,
          currency: (session.currency ?? 'pkr').toUpperCase(),
          gateway: 'STRIPE',
          gatewayTransactionId:
            typeof session.payment_intent === 'string' ? session.payment_intent : subscriptionId,
          status: 'SUCCESS',
          metadata: { sessionId: session.id, subscriptionId },
        },
      });
    });
  }

  private async handleSubscriptionDeleted(sub: StripeSub): Promise<void> {
    await this.prisma.enrollment.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: {
        status: EnrollmentStatus.EXPIRED,
        plan: EnrollmentPlan.FREE,
      },
    });
  }

  private async handlePaymentFailed(invoice: StripeInvoice): Promise<void> {
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
    if (!subscriptionId) return;

    await this.prisma.enrollment.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: EnrollmentStatus.PAUSED },
    });
  }
}
