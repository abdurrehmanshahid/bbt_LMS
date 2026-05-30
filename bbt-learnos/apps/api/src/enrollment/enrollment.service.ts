import { createHmac, randomUUID } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EnrollmentPlan, EnrollmentStatus, Prisma } from '@prisma/client';
import Stripe from 'stripe';

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
type PaidPlan = 'MONTHLY' | 'ANNUAL';
type EasyPaisaMethod = 'MA' | 'OTC';
export type LocalPaymentGateway = 'JAZZCASH' | 'EASYPAISA';
type LocalPaymentStatus = 'SUCCESS' | 'FAILED';

export interface LocalCheckoutResponse {
  gateway: LocalPaymentGateway;
  paymentId: string;
  transactionRef: string;
  amount: number;
  currency: 'PKR';
  redirect?: {
    method: 'POST';
    url: string;
    fields: Record<string, string>;
  };
  instructions?: {
    method: EasyPaisaMethod;
    orderRef: string;
    amount: number;
    message: string;
    expiresAt: string;
  };
}

interface PendingPaymentMetadata extends Prisma.JsonObject {
  userId: string;
  trackId: string;
  plan: PaidPlan;
}

interface JazzCashReturnPayload extends Record<string, string | undefined> {
  pp_TxnRefNo?: string;
  pp_ResponseCode?: string;
  pp_ResponseMessage?: string;
  pp_RetreivalReferenceNo?: string;
  pp_Amount?: string;
  pp_SecureHash?: string;
}

interface EasyPaisaWebhookPayload extends Record<string, string | undefined> {
  orderRefNum?: string;
  transactionId?: string;
  transactionStatus?: string;
  status?: string;
  amount?: string;
  hash?: string;
  signature?: string;
}

const PLAN_PRICE_IDS: Record<PaidPlan, string> = {
  MONTHLY: '',
  ANNUAL: '',
};
const LOCAL_SPONSORED_FULL_ACCESS_EMAILS = ['abdurrehman545@gmail.com'];

@Injectable()
export class EnrollmentService {
  // Use InstanceType so the class and namespace don't conflict
  private stripe?: InstanceType<typeof Stripe>;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');
    PLAN_PRICE_IDS.MONTHLY = this.config.get<string>('STRIPE_MONTHLY_PRICE_ID', '');
    PLAN_PRICE_IDS.ANNUAL = this.config.get<string>('STRIPE_ANNUAL_PRICE_ID', '');
  }

  private getStripe(): InstanceType<typeof Stripe> {
    if (this.stripe) return this.stripe;

    const stripeSecretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    if (!stripeSecretKey) {
      throw new BadRequestException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: 'Stripe payment provider is not configured',
        field: 'STRIPE_SECRET_KEY',
      });
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2026-03-25.dahlia',
    });
    return this.stripe;
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
    plan: PaidPlan,
  ): Promise<{ url: string }> {
    const [track, user] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);
    if (!track) throw new NotFoundException('Track not found');
    if (!user) throw new NotFoundException('User not found');

    const userEmail = user.email;
    if (this.config.get('DEMO_PAID_FREE') === 'true' || this.hasSponsoredFullAccess(userEmail)) {
      await this.grantPaidEnrollment(userId, trackId, plan, null);
      return {
        url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/enroll/success?trackId=${trackId}`,
      };
    }

    const stripe = this.getStripe();
    const priceId = PLAN_PRICE_IDS[plan];
    if (!priceId) throw new BadRequestException(`Price not configured for plan ${plan}`);

    // Find or create Stripe customer
    let customerId: string;
    const existing = await stripe.customers.list({ email: userEmail, limit: 1 });
    if (existing.data.length > 0 && existing.data[0]) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/enroll/success?trackId=${trackId}`,
      cancel_url: `${this.config.get('FRONTEND_URL', 'http://localhost:3000')}/tracks/${track.slug}`,
      subscription_data: {
        metadata: { userId, trackId, plan },
      },
    });

    return { url: session.url! };
  }

  async createJazzCashCheckout(
    userId: string,
    trackId: string,
    plan: PaidPlan,
  ): Promise<LocalCheckoutResponse> {
    if (this.config.get('DEMO_PAID_FREE') === 'true') {
      const track = await this.prisma.track.findUnique({ where: { id: trackId } });
      if (!track) throw new NotFoundException('Track not found');
      await this.grantPaidEnrollment(userId, trackId, plan, null);
      const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
      return {
        paymentId: 'demo',
        transactionRef: 'demo',
        amount: 0,
        currency: 'PKR',
        gateway: 'JAZZCASH' as const,
        redirect: { method: 'POST' as const, url: `${frontendUrl}/enroll/success?trackId=${trackId}`, fields: {} },
      };
    }

    const paymentUrl = this.config.get<string>(
      'JAZZCASH_PAYMENT_URL',
      'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
    );
    const merchantId = this.requiredConfig('JAZZCASH_MERCHANT_ID');
    const password = this.requiredConfig('JAZZCASH_PASSWORD');
    const integritySalt = this.requiredConfig('JAZZCASH_INTEGRITY_SALT');
    const payment = await this.createPendingLocalPayment(userId, trackId, plan, 'JAZZCASH');
    const issuedAt = this.formatGatewayDate(new Date());
    const expiresAtDate = new Date(Date.now() + 60 * 60 * 1000);
    const expiresAt = this.formatGatewayDate(expiresAtDate);
    const returnUrl = `${this.config.get('API_PUBLIC_URL', 'http://localhost:4000')}/api/payments/jazzcash/return`;
    const amountInPaisas = String(Math.round(payment.amount * 100));

    const fields: Record<string, string> = {
      pp_Version: '2.0',
      pp_TxnType: 'MIGS',
      pp_Language: 'EN',
      pp_MerchantID: merchantId,
      pp_Password: password,
      pp_TxnRefNo: payment.transactionRef,
      pp_Amount: amountInPaisas,
      pp_TxnCurrency: 'PKR',
      pp_TxnDateTime: issuedAt,
      pp_BillReference: payment.paymentId,
      pp_Description: `BBT LearnOS ${plan.toLowerCase()} enrollment`,
      pp_TxnExpiryDateTime: expiresAt,
      pp_ReturnURL: returnUrl,
    };

    fields['pp_SecureHash'] = this.signSortedFields(fields, integritySalt);

    return {
      ...payment,
      redirect: {
        method: 'POST',
        url: paymentUrl,
        fields,
      },
    };
  }

  async createEasyPaisaCheckout(
    userId: string,
    trackId: string,
    plan: PaidPlan,
    method: EasyPaisaMethod,
    mobileNumber?: string,
  ): Promise<LocalCheckoutResponse> {
    if (this.config.get('DEMO_PAID_FREE') === 'true') {
      const track = await this.prisma.track.findUnique({ where: { id: trackId } });
      if (!track) throw new NotFoundException('Track not found');
      await this.grantPaidEnrollment(userId, trackId, plan, null);
      const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
      return {
        paymentId: 'demo',
        transactionRef: 'demo',
        amount: 0,
        currency: 'PKR',
        gateway: 'EASYPAISA' as const,
        redirect: { method: 'POST' as const, url: `${frontendUrl}/enroll/success?trackId=${trackId}`, fields: {} },
      };
    }

    if (method === 'MA' && !mobileNumber) {
      throw new BadRequestException({
        code: 'MOBILE_NUMBER_REQUIRED',
        message: 'EasyPaisa mobile account checkout requires a mobile number',
        field: 'mobileNumber',
      });
    }

    const storeId = this.requiredConfig('EASYPAISA_STORE_ID');
    const integritySalt = this.requiredConfig('EASYPAISA_INTEGRITY_SALT');
    const payment = await this.createPendingLocalPayment(userId, trackId, plan, 'EASYPAISA');
    const expiresAtDate = new Date(Date.now() + 60 * 60 * 1000);
    const expiresAt = expiresAtDate.toISOString();
    const postBackURL = `${this.config.get('API_PUBLIC_URL', 'http://localhost:4000')}/api/webhooks/easypaisa`;

    if (method === 'OTC') {
      await this.prisma.payment.update({
        where: { id: payment.paymentId },
        data: {
          metadata: {
            userId,
            trackId,
            plan,
            method,
            orderRef: payment.transactionRef,
            expiresAt,
          },
        },
      });

      return {
        ...payment,
        instructions: {
          method,
          orderRef: payment.transactionRef,
          amount: payment.amount,
          expiresAt,
          message: 'Use this order reference at an EasyPaisa retailer or app OTC payment flow.',
        },
      };
    }

    const paymentUrl = this.config.get<string>(
      'EASYPAISA_PAYMENT_URL',
      'https://easypaystg.easypaisa.com.pk/easypay/Index.jsf',
    );
    const fields: Record<string, string> = {
      storeId,
      amount: payment.amount.toFixed(2),
      postBackURL,
      orderRefNum: payment.transactionRef,
      paymentMethod: method,
      mobileNum: mobileNumber ?? '',
      expiryDate: expiresAt,
      autoRedirect: '1',
    };
    fields['merchantHashedReq'] = this.signSortedFields(fields, integritySalt);

    await this.prisma.payment.update({
      where: { id: payment.paymentId },
      data: {
        metadata: {
          userId,
          trackId,
          plan,
          method,
          orderRef: payment.transactionRef,
          expiresAt,
        },
      },
    });

    return {
      ...payment,
      redirect: {
        method: 'POST',
        url: paymentUrl,
        fields,
      },
    };
  }

  // ─── Cancel enrollment ───────────────────────────────────────────────────────

  async cancel(userId: string, trackId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    if (enrollment.stripeSubscriptionId) {
      await this.getStripe().subscriptions.cancel(enrollment.stripeSubscriptionId);
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

  async handleJazzCashReturn(payload: JazzCashReturnPayload): Promise<{ status: LocalPaymentStatus; redirectUrl: string }> {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const transactionRef = payload.pp_TxnRefNo;
    if (!transactionRef) {
      throw new BadRequestException({
        code: 'PAYMENT_REFERENCE_MISSING',
        message: 'JazzCash return payload is missing transaction reference',
        field: 'pp_TxnRefNo',
      });
    }

    this.verifySignedPayload(payload, 'pp_SecureHash', this.requiredConfig('JAZZCASH_INTEGRITY_SALT'));
    const status: LocalPaymentStatus = payload.pp_ResponseCode === '000' ? 'SUCCESS' : 'FAILED';
    const payment = await this.finalizeLocalPayment(
      'JAZZCASH',
      transactionRef,
      status,
      {
        providerResponseCode: payload.pp_ResponseCode ?? '',
        providerResponseMessage: payload.pp_ResponseMessage ?? '',
        retrievalReferenceNo: payload.pp_RetreivalReferenceNo ?? '',
      },
    );

    return {
      status,
      redirectUrl: `${frontendUrl}/enroll/${status === 'SUCCESS' ? 'success' : 'failed'}?paymentId=${payment.id}`,
    };
  }

  async handleEasyPaisaWebhook(payload: EasyPaisaWebhookPayload): Promise<{ received: true; status: LocalPaymentStatus }> {
    const transactionRef = payload.orderRefNum;
    if (!transactionRef) {
      throw new BadRequestException({
        code: 'PAYMENT_REFERENCE_MISSING',
        message: 'EasyPaisa webhook payload is missing order reference',
        field: 'orderRefNum',
      });
    }

    const signatureField = payload.hash ? 'hash' : 'signature';
    this.verifySignedPayload(payload, signatureField, this.requiredConfig('EASYPAISA_INTEGRITY_SALT'));
    const providerStatus = (payload.transactionStatus ?? payload.status ?? '').toUpperCase();
    const status: LocalPaymentStatus = ['PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'].includes(providerStatus)
      ? 'SUCCESS'
      : 'FAILED';

    await this.finalizeLocalPayment(
      'EASYPAISA',
      transactionRef,
      status,
      {
        providerStatus,
        transactionId: payload.transactionId ?? '',
      },
    );

    return { received: true, status };
  }

  async handleStripeWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: StripeEvent;
    try {
      event = this.getStripe().webhooks.constructEvent(payload, signature, this.webhookSecret) as unknown as StripeEvent;
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

  private async createPendingLocalPayment(
    userId: string,
    trackId: string,
    plan: PaidPlan,
    gateway: LocalPaymentGateway,
  ): Promise<Omit<LocalCheckoutResponse, 'redirect' | 'instructions'>> {
    const [track, user, existingEnrollment] = await Promise.all([
      this.prisma.track.findUnique({ where: { id: trackId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.enrollment.findUnique({
        where: { learnerId_trackId: { learnerId: userId, trackId } },
      }),
    ]);
    if (!track) throw new NotFoundException('Track not found');
    if (!user) throw new NotFoundException('User not found');
    if (existingEnrollment?.status === EnrollmentStatus.ACTIVE && existingEnrollment.plan !== EnrollmentPlan.FREE) {
      throw new ConflictException({
        code: 'ALREADY_ENROLLED',
        message: 'Already enrolled in this track',
        field: 'trackId',
      });
    }

    const amount = this.getPlanAmount(plan);
    const transactionRef = `BBT-${gateway}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const metadata: PendingPaymentMetadata = { userId, trackId, plan };
    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount,
        currency: 'PKR',
        gateway,
        gatewayTransactionId: transactionRef,
        status: 'PENDING',
        metadata,
      },
    });

    return {
      gateway,
      paymentId: payment.id,
      transactionRef,
      amount,
      currency: 'PKR',
    };
  }

  private async finalizeLocalPayment(
    gateway: LocalPaymentGateway,
    transactionRef: string,
    status: LocalPaymentStatus,
    providerDetails: Prisma.JsonObject,
  ) {
    const payment = await this.prisma.payment.findFirst({
      where: { gateway, gatewayTransactionId: transactionRef },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const metadata = this.readPendingMetadata(payment.metadata);
    return this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          metadata: {
            ...metadata,
            providerDetails,
          },
        },
      });

      if (status !== 'SUCCESS') return updatedPayment;

      await this.grantPaidEnrollmentInTransaction(
        tx,
        metadata.userId,
        metadata.trackId,
        metadata.plan,
        null,
      );

      return updatedPayment;
    });
  }

  private readPendingMetadata(metadata: Prisma.JsonValue): PendingPaymentMetadata {
    if (
      !metadata ||
      typeof metadata !== 'object' ||
      Array.isArray(metadata) ||
      typeof metadata['userId'] !== 'string' ||
      typeof metadata['trackId'] !== 'string' ||
      (metadata['plan'] !== 'MONTHLY' && metadata['plan'] !== 'ANNUAL')
    ) {
      throw new BadRequestException({
        code: 'PAYMENT_METADATA_INVALID',
        message: 'Payment metadata is invalid',
      });
    }

    return {
      userId: metadata['userId'],
      trackId: metadata['trackId'],
      plan: metadata['plan'],
    };
  }

  private getPlanAmount(plan: PaidPlan): number {
    const configKey = plan === 'MONTHLY' ? 'BBT_MONTHLY_PRICE_PKR' : 'BBT_ANNUAL_PRICE_PKR';
    const fallback = plan === 'MONTHLY' ? '2999' : '29990';
    const amount = Number(this.config.get<string>(configKey, fallback));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: 'PAYMENT_AMOUNT_INVALID',
        message: `Price is not configured for plan ${plan}`,
        field: configKey,
      });
    }
    return amount;
  }

  private requiredConfig(key: string): string {
    const value = this.config.get<string>(key, '');
    if (!value) {
      throw new BadRequestException({
        code: 'PAYMENT_PROVIDER_NOT_CONFIGURED',
        message: `${key} is not configured`,
        field: key,
      });
    }
    return value;
  }

  private formatGatewayDate(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate()),
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds()),
    ].join('');
  }

  private signSortedFields(fields: Record<string, string>, secret: string): string {
    const payload = Object.entries(fields)
      .filter(([key, value]) =>
        value !== '' &&
        !['pp_SecureHash', 'merchantHashedReq', 'hash', 'signature'].includes(key),
      )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => value)
      .join('&');

    return createHmac('sha256', secret).update(`${secret}&${payload}`).digest('hex').toUpperCase();
  }

  private verifySignedPayload(
    payload: JazzCashReturnPayload | EasyPaisaWebhookPayload,
    hashField: 'pp_SecureHash' | 'hash' | 'signature',
    secret: string,
  ): void {
    const received = payload[hashField];
    if (!received) {
      throw new BadRequestException({
        code: 'PAYMENT_SIGNATURE_MISSING',
        message: 'Payment callback signature is missing',
        field: hashField,
      });
    }

    const fields = Object.fromEntries(
      Object.entries(payload).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    const expected = this.signSortedFields(fields, secret);
    if (expected.toUpperCase() !== received.toUpperCase()) {
      throw new BadRequestException({
        code: 'PAYMENT_SIGNATURE_INVALID',
        message: 'Payment callback signature is invalid',
        field: hashField,
      });
    }
  }

  private async handleCheckoutCompleted(session: StripeCheckoutSession): Promise<void> {
    const subscriptionId = session.subscription as string;
    const subscription = await this.getStripe().subscriptions.retrieve(subscriptionId);
    const { userId, trackId, plan } = subscription.metadata as {
      userId: string;
      trackId: string;
      plan: 'MONTHLY' | 'ANNUAL';
    };

    const track = await this.prisma.track.findUnique({ where: { id: trackId } });
    if (!track) return;

    await this.prisma.$transaction(async (tx) => {
      await this.grantPaidEnrollmentInTransaction(tx, userId, trackId, plan, subscriptionId);

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

  private hasSponsoredFullAccess(email: string): boolean {
    const configuredEmails = this.config
      .get<string>('SPONSORED_FULL_ACCESS_EMAILS', '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    const localEmails = this.config.get<string>('NODE_ENV', 'development') === 'production'
      ? []
      : LOCAL_SPONSORED_FULL_ACCESS_EMAILS;
    const allowedEmails = new Set([...configuredEmails, ...localEmails]);
    return allowedEmails.has(email.toLowerCase());
  }

  private async grantPaidEnrollment(
    userId: string,
    trackId: string,
    plan: PaidPlan,
    stripeSubscriptionId: string | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.grantPaidEnrollmentInTransaction(tx, userId, trackId, plan, stripeSubscriptionId);
    });
  }

  private async grantPaidEnrollmentInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    trackId: string,
    plan: PaidPlan,
    stripeSubscriptionId: string | null,
  ): Promise<void> {
    const existing = await tx.enrollment.findUnique({
      where: { learnerId_trackId: { learnerId: userId, trackId } },
      select: { id: true, status: true },
    });

    if (existing) {
      await tx.enrollment.update({
        where: { learnerId_trackId: { learnerId: userId, trackId } },
        data: {
          plan: EnrollmentPlan[plan],
          status: EnrollmentStatus.ACTIVE,
          stripeSubscriptionId,
          endDate: null,
        },
      });
    } else {
      await tx.enrollment.create({
        data: {
          learnerId: userId,
          trackId,
          plan: EnrollmentPlan[plan],
          status: EnrollmentStatus.ACTIVE,
          stripeSubscriptionId,
        },
      });
      await tx.track.update({
        where: { id: trackId },
        data: { enrollmentCount: { increment: 1 } },
      });
    }

    await tx.learnerProfile.upsert({
      where: { userId },
      create: { userId, currentTrackId: trackId },
      update: { currentTrackId: trackId },
    });
    this.eventEmitter.emit('enrollment.created', { userId, trackId });
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
