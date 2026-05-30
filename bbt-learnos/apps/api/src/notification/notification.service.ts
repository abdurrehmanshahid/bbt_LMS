import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';

import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

import {
  PushJobData,
  EmailJobData,
  PUSH_QUEUE,
  EMAIL_QUEUE,
  MAX_DAILY_PUSHES,
  DND_START_HOUR,
  DND_END_HOUR,
  NotificationCategory,
} from './notification.types';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue<PushJobData>,
    @InjectQueue(EMAIL_QUEUE) private readonly emailQueue: Queue<EmailJobData>,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  // ─── Event handlers ──────────────────────────────────────────────────────────

  @OnEvent('assessment.passed')
  async onAssessmentPassed(event: { userId: string; moduleId: string }): Promise<void> {
    await this.sendPush({
      userId: event.userId,
      title: 'Badge Earned! 🏅',
      body: 'You passed the assessment and earned a new skill badge.',
      category: 'BADGE_ISSUED',
      data: { moduleId: event.moduleId },
    });
  }

  @OnEvent('cohort.member_progress')
  async onCohortMemberProgress(event: {
    cohortId: string;
    userId: string;
    moduleTitle: string;
  }): Promise<void> {
    // Notify all cohort members except the one who completed
    const members = await this.prisma.cohortMember.findMany({
      where: {
        cohortId: event.cohortId,
        learnerId: { not: event.userId },
      },
      select: { learnerId: true },
    });

    for (const member of members) {
      await this.sendPush({
        userId: member.learnerId,
        title: 'Cohort activity 🚀',
        body: `A cohort member completed "${event.moduleTitle}"`,
        category: 'COHORT_ACTIVITY',
        data: { cohortId: event.cohortId },
      });
    }
  }

  @OnEvent('enrollment.created')
  async onEnrollmentCreated(event: { userId: string; trackId: string }): Promise<void> {
    await this.sendPush({
      userId: event.userId,
      title: 'Welcome to your track! 🎓',
      body: 'Your first 2 modules are unlocked. Start learning!',
      category: 'MODULE_UNLOCKED',
      data: { trackId: event.trackId },
    });
  }

  @OnEvent('payment.failed')
  async onPaymentFailed(event: { userId: string; email: string }): Promise<void> {
    await this.sendEmail({
      userId: event.userId,
      to: event.email,
      subject: 'Payment issue — action required',
      template: 'payment_failed',
      vars: { userId: event.userId },
    });
  }

  @OnEvent('moderation.feedback')
  async onModerationFeedback(event: {
    creatorId: string;
    contentTitle: string;
    decision: string;
  }): Promise<void> {
    await this.sendPush({
      userId: event.creatorId,
      title: 'Moderation update',
      body: `Your content "${event.contentTitle}" was ${event.decision.toLowerCase()}.`,
      category: 'MODERATION',
    });
  }

  // ─── Streak warning (scheduled daily at 6pm UTC) ────────────────────────────

  @Cron('0 18 * * *')
  async scheduleStreakWarnings(): Promise<void> {
    // Find learners who haven't been active today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inactive = await this.prisma.learnerProfile.findMany({
      where: { lastActiveAt: { lt: today } },
      select: { userId: true },
    });

    for (const learner of inactive) {
      await this.sendPush({
        userId: learner.userId,
        title: "Don't lose your streak! 🔥",
        body: 'Log in today to keep your learning streak alive.',
        category: 'STREAK_WARNING',
      });
    }
  }

  // ─── Core send methods ───────────────────────────────────────────────────────

  async sendPush(data: PushJobData): Promise<void> {
    // Check opt-in
    const optedIn = await this.isOptedIn(data.userId, data.category);
    if (!optedIn) return;

    // Check daily cap
    const underCap = await this.checkAndIncrementDailyCap(data.userId);
    if (!underCap) return;

    // DND check
    if (this.isDndHour()) {
      // Delay until 8am
      const delay = this.msUntilMorning();
      await this.pushQueue.add('send-push', data, { delay });
    } else {
      await this.pushQueue.add('send-push', data);
    }
  }

  async sendEmail(data: EmailJobData): Promise<void> {
    await this.emailQueue.add('send-email', data);
  }

  // ─── Notification settings ───────────────────────────────────────────────────

  async getSettings(userId: string): Promise<Record<NotificationCategory, boolean>> {
    const key = `notif:settings:${userId}`;
    const raw = await this.redis.get(key);

    const defaults: Record<NotificationCategory, boolean> = {
      COHORT_ACTIVITY: true,
      BADGE_ISSUED: true,
      STREAK_WARNING: true,
      MODULE_UNLOCKED: true,
      LIVE_SESSION: true,
      MODERATION: true,
      PAYMENT: true,
    };

    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Record<NotificationCategory, boolean>>) };
  }

  async updateSettings(
    userId: string,
    updates: Partial<Record<NotificationCategory, boolean>>,
  ): Promise<Record<NotificationCategory, boolean>> {
    const current = await this.getSettings(userId);
    const merged = { ...current, ...updates };
    await this.redis.set(`notif:settings:${userId}`, JSON.stringify(merged), 'EX', 86400 * 365);
    return merged;
  }

  // ─── Notification inbox ──────────────────────────────────────────────────────

  async getInbox(userId: string, page = 1) {
    const skip = (page - 1) * 20;
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        take: 20,
        skip,
        select: { id: true, type: true, title: true, body: true, isRead: true, sentAt: true, data: true },
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);
    return { items, total, unread: items.filter((n) => !n.isRead).length };
  }

  async markRead(userId: string, notificationId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async isOptedIn(userId: string, category: NotificationCategory): Promise<boolean> {
    const settings = await this.getSettings(userId);
    return settings[category] ?? true;
  }

  private async checkAndIncrementDailyCap(userId: string): Promise<boolean> {
    const key = `notif:daily:${userId}:${new Date().toISOString().slice(0, 10)}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, 86400);
    }
    return count <= MAX_DAILY_PUSHES;
  }

  private isDndHour(): boolean {
    const hour = new Date().getUTCHours();
    return hour >= DND_START_HOUR || hour < DND_END_HOUR;
  }

  private msUntilMorning(): number {
    const now = new Date();
    const morning = new Date(now);
    morning.setUTCHours(DND_END_HOUR, 0, 0, 0);
    if (morning <= now) morning.setUTCDate(morning.getUTCDate() + 1);
    return morning.getTime() - now.getTime();
  }
}
