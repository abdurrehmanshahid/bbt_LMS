import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PayoutMethod, PayoutStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

interface StripeConnectEvent {
  type: string;
  data: { object: Record<string, unknown> };
}
interface StripeConnectAccount {
  id: string;
  charges_enabled: boolean;
  details_submitted: boolean;
}

import { NotificationService } from '../notification/notification.service';
import { PrismaService } from '../prisma/prisma.service';

const MIN_PAYOUT_PKR = 5000;

export interface RevenueResponse {
  totalEarned: number;
  pendingPayout: number;
  paidOut: number;
  currency: string;
  minPayoutThreshold: number;
  breakdown: { source: string; amount: number }[];
  history: { id: string; paidAt: string | null; amount: number; method: string; status: string }[];
}

export interface ConnectStatusResponse {
  accountId: string | null;
  onboarded: boolean;
}

export interface AdminPayoutRow {
  id: string;
  creatorName: string;
  creatorDisplayName: string;
  creatorTier: number;
  amount: number;
  currency: string;
  method: string;
  status: string;
  requestedAt: string;
  paidAt: string | null;
}

@Injectable()
export class PayoutService {
  private stripe?: InstanceType<typeof Stripe>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  private getStripe(): InstanceType<typeof Stripe> {
    if (this.stripe) return this.stripe;
    const key = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (!key) {
      throw new BadRequestException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Stripe is not configured',
      });
    }
    this.stripe = new Stripe(key, { apiVersion: '2026-03-25.dahlia' });
    return this.stripe;
  }

  // ─── Revenue summary ──────────────────────────────────────────────────────────

  async getRevenue(creatorId: string): Promise<RevenueResponse> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');

    const revenueShare = profile.revenueSharePercent / 100;
    const currency = 'PKR';

    // Find tracks where this creator has approved content
    const creatorTracks = await this.prisma.content.findMany({
      where: { creatorId, status: 'APPROVED' },
      select: { trackId: true },
      distinct: ['trackId'],
    });
    const trackIds = creatorTracks.map((c) => c.trackId);

    // Sum SUCCESS payments for those tracks
    const payments = trackIds.length
      ? await this.prisma.payment.findMany({
          where: {
            status: 'SUCCESS',
            metadata: { path: ['trackId'], not: Prisma.DbNull },
          },
          select: { id: true, amount: true, currency: true, gateway: true, metadata: true },
        })
      : [];

    // Filter to payments for creator's tracks (metadata.trackId in trackIds)
    const relevant = payments.filter((p) => {
      const meta = p.metadata as Prisma.JsonObject;
      return typeof meta['trackId'] === 'string' && trackIds.includes(meta['trackId']);
    });

    const totalEarned = relevant.reduce((sum, p) => sum + p.amount * revenueShare, 0);

    // Breakdown by gateway
    const gatewayTotals = new Map<string, number>();
    for (const p of relevant) {
      const prev = gatewayTotals.get(p.gateway) ?? 0;
      gatewayTotals.set(p.gateway, prev + p.amount * revenueShare);
    }
    const breakdown = Array.from(gatewayTotals.entries()).map(([source, amount]) => ({
      source,
      amount: Math.round(amount),
    }));

    // Paid out from CreatorPayout records
    const payouts = await this.prisma.creatorPayout.findMany({
      where: { creatorId },
      orderBy: { requestedAt: 'desc' },
    });

    const paidOut = payouts
      .filter((p) => p.status === PayoutStatus.PAID)
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayout = Math.max(0, totalEarned - paidOut);
    const minPayoutThreshold = MIN_PAYOUT_PKR;

    const history = payouts.map((p) => ({
      id: p.id,
      paidAt: p.paidAt?.toISOString() ?? null,
      amount: p.amount,
      method: p.method,
      status: p.status,
    }));

    return {
      totalEarned: Math.round(totalEarned),
      pendingPayout: Math.round(pendingPayout),
      paidOut: Math.round(paidOut),
      currency,
      minPayoutThreshold,
      breakdown,
      history,
    };
  }

  // ─── Request payout ───────────────────────────────────────────────────────────

  async requestPayout(creatorId: string) {
    const revenue = await this.getRevenue(creatorId);
    if (revenue.pendingPayout < revenue.minPayoutThreshold) {
      throw new BadRequestException({
        code: 'PAYOUT_THRESHOLD_NOT_MET',
        message: `Minimum payout is ${revenue.minPayoutThreshold} ${revenue.currency}. Available: ${revenue.pendingPayout}`,
      });
    }

    // Block if there's already a pending payout
    const existing = await this.prisma.creatorPayout.findFirst({
      where: { creatorId, status: PayoutStatus.PENDING },
    });
    if (existing) {
      throw new BadRequestException({
        code: 'PAYOUT_ALREADY_PENDING',
        message: 'A payout request is already pending review',
      });
    }

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
    });

    const method: PayoutMethod = profile?.stripeConnectOnboarded
      ? PayoutMethod.STRIPE_CONNECT
      : PayoutMethod.BANK_TRANSFER;

    const payout = await this.prisma.creatorPayout.create({
      data: {
        creatorId,
        amount: revenue.pendingPayout,
        currency: revenue.currency,
        method,
        stripeConnectAccountId: profile?.stripeConnectAccountId ?? null,
      },
    });

    // Notify admins via a system notification to admin users
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    await Promise.all(
      admins.map((admin) =>
        this.notificationService.sendPush({
          userId: admin.id,
          title: 'Payout Request',
          body: `Creator requested payout of ${revenue.pendingPayout} ${revenue.currency}`,
          category: 'MODERATION',
          data: { payoutId: payout.id, creatorId },
        }),
      ),
    );

    return payout;
  }

  // ─── Stripe Connect onboarding ────────────────────────────────────────────────

  async onboardStripeConnect(creatorId: string): Promise<{ url?: string; alreadyOnboarded?: boolean }> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
    });
    if (!profile) throw new NotFoundException('Creator profile not found');

    if (profile.stripeConnectOnboarded) {
      return { alreadyOnboarded: true };
    }

    const stripe = this.getStripe();
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const refreshUrl = `${frontendUrl}/creator/revenue?connect=refresh`;
    const returnUrl = `${frontendUrl}/creator/revenue?connect=success`;

    let accountId = profile.stripeConnectAccountId;

    if (!accountId) {
      const user = await this.prisma.user.findUnique({
        where: { id: creatorId },
        select: { email: true },
      });
      const account = await stripe.accounts.create({
        type: 'express',
        ...(user?.email ? { email: user.email } : {}),
        metadata: { creatorId },
      });
      accountId = account.id;
      await this.prisma.creatorProfile.update({
        where: { userId: creatorId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { url: accountLink.url };
  }

  async getConnectStatus(creatorId: string): Promise<ConnectStatusResponse> {
    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId: creatorId },
      select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });
    return {
      accountId: profile?.stripeConnectAccountId ?? null,
      onboarded: profile?.stripeConnectOnboarded ?? false,
    };
  }

  // ─── Stripe Connect webhook ───────────────────────────────────────────────────

  async handleConnectWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.config.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET', '');
    if (!webhookSecret) return;

    let event: StripeConnectEvent;
    try {
      event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret) as unknown as StripeConnectEvent;
    } catch {
      throw new BadRequestException('Invalid Stripe Connect webhook signature');
    }

    if (event.type === 'account.updated') {
      const account = event.data.object as unknown as StripeConnectAccount;
      if (account.charges_enabled && account.details_submitted) {
        await this.prisma.creatorProfile.updateMany({
          where: { stripeConnectAccountId: account.id },
          data: { stripeConnectOnboarded: true },
        });
      }
    }
  }

  // ─── Admin: list payouts ──────────────────────────────────────────────────────

  async adminListPayouts(page: number, status?: string): Promise<{ items: AdminPayoutRow[]; total: number }> {
    const pageSize = 20;
    const where: Prisma.CreatorPayoutWhereInput = status
      ? { status: status as PayoutStatus }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.creatorPayout.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          creator: {
            select: {
              name: true,
              creatorProfile: { select: { displayName: true, tier: true } },
            },
          },
        },
      }),
      this.prisma.creatorPayout.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        id: p.id,
        creatorName: p.creator.name,
        creatorDisplayName: p.creator.creatorProfile?.displayName ?? p.creator.name,
        creatorTier: p.creator.creatorProfile?.tier ?? 1,
        amount: p.amount,
        currency: p.currency,
        method: p.method,
        status: p.status,
        requestedAt: p.requestedAt.toISOString(),
        paidAt: p.paidAt?.toISOString() ?? null,
      })),
      total,
    };
  }

  // ─── Admin: process payout ────────────────────────────────────────────────────

  async adminProcessPayout(
    payoutId: string,
    adminId: string,
    method: PayoutMethod,
    bankRef?: string,
  ) {
    const payout = await this.prisma.creatorPayout.findUnique({
      where: { id: payoutId },
      include: { creator: { select: { id: true, name: true } } },
    });
    if (!payout) throw new NotFoundException('Payout not found');
    if (payout.status !== PayoutStatus.PENDING) {
      throw new BadRequestException({
        code: 'PAYOUT_ALREADY_PROCESSED',
        message: 'This payout has already been processed',
      });
    }

    let stripeTransferId: string | null = null;

    if (method === PayoutMethod.STRIPE_CONNECT) {
      if (!payout.stripeConnectAccountId) {
        throw new BadRequestException({
          code: 'STRIPE_CONNECT_NOT_CONFIGURED',
          message: 'Creator has no Stripe Connect account',
        });
      }
      const transfer = await this.getStripe().transfers.create({
        amount: Math.round(payout.amount * 100),
        currency: payout.currency.toLowerCase(),
        destination: payout.stripeConnectAccountId,
        metadata: { payoutId, creatorId: payout.creatorId },
      });
      stripeTransferId = transfer.id;
    } else {
      if (!bankRef) {
        throw new BadRequestException({
          code: 'BANK_REF_REQUIRED',
          message: 'Bank reference is required for bank transfer payouts',
        });
      }
    }

    const updated = await this.prisma.creatorPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        method,
        paidAt: new Date(),
        processedById: adminId,
        ...(stripeTransferId ? { stripeTransferId } : {}),
        ...(bankRef ? { bankRef } : {}),
      },
    });

    await this.notificationService.sendPush({
      userId: payout.creatorId,
      title: 'Payout Processed',
      body: `Your payout of ${payout.amount} ${payout.currency} has been sent.`,
      category: 'MODERATION',
      data: { payoutId },
    });

    return updated;
  }
}
