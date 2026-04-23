export type NotificationCategory =
  | 'COHORT_ACTIVITY'
  | 'BADGE_ISSUED'
  | 'STREAK_WARNING'
  | 'MODULE_UNLOCKED'
  | 'LIVE_SESSION'
  | 'MODERATION'
  | 'PAYMENT';

export interface PushJobData {
  userId: string;
  title: string;
  body: string;
  category: NotificationCategory;
  data?: Record<string, string>;
  scheduledFor?: Date;
}

export interface EmailJobData {
  userId: string;
  to: string;
  subject: string;
  template: 'payment_failed' | 'badge_issued' | 'streak_warning' | 'moderation_feedback';
  vars: Record<string, unknown>;
}

export const PUSH_QUEUE = 'notification-push';
export const EMAIL_QUEUE = 'notification-email';

// Daily push cap per user
export const MAX_DAILY_PUSHES = 3;
// DND window: 10pm to 8am local (we use UTC simple approximation)
export const DND_START_HOUR = 22;
export const DND_END_HOUR = 8;
