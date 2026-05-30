import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { EmailService } from '../email/email.service';

import { EmailJobData, EMAIL_QUEUE } from './notification.types';

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template, vars } = job.data;

    // Build simple text body from template (full HTML templates in Phase 2)
    const body = this.renderTemplate(template, vars);

    await this.emailService.send({ to, subject, text: body });
    this.logger.log(`Email sent to ${to}: ${subject}`);
  }

  private renderTemplate(template: string, vars: Record<string, unknown>): string {
    const templates: Record<string, (v: Record<string, unknown>) => string> = {
      payment_failed: () =>
        `Your subscription payment failed. Please update your payment method at bbt.edu.pk/billing to retain access.`,
      badge_issued: (v) =>
        `Congratulations! You earned a new skill badge: ${String(v['badgeName'] ?? '')}. View it at bbt.edu.pk/portfolio.`,
      streak_warning: () =>
        `Don't lose your learning streak! Log in today at bbt.edu.pk to keep it alive.`,
      moderation_feedback: (v) =>
        `Your content "${String(v['contentTitle'] ?? '')}" has been reviewed. Decision: ${String(v['decision'] ?? '')}. Login to see details.`,
    };

    const fn = templates[template];
    return fn ? fn(vars) : `Notification from BBT LearnOS.`;
  }
}
