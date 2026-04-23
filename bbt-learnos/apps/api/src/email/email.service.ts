import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const base = this.configService.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
    const url = `${base}/auth/verify-email/${token}`;
    this.logger.log(`[EMAIL] Verification → ${to} | ${url}`);
    // SES integration delivered in Step 5 (Notification module)
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const base = this.configService.get<string>('NEXT_PUBLIC_API_URL', 'http://localhost:3000');
    const url = `${base}/auth/reset-password/${token}`;
    this.logger.log(`[EMAIL] Password reset → ${to} | ${url}`);
  }

  async send(opts: { to: string; subject: string; text: string }): Promise<void> {
    this.logger.log(`[EMAIL] → ${opts.to} | ${opts.subject}`);
    // TODO: replace stub with @aws-sdk/client-ses in production
  }
}
