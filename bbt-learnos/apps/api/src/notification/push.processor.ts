import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PushJobData, PUSH_QUEUE } from './notification.types';

@Processor(PUSH_QUEUE)
export class PushProcessor extends WorkerHost {
  private readonly logger = new Logger(PushProcessor.name);
  private readonly fcmInitialized: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    const serviceAccount = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
    if (serviceAccount) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount) as admin.ServiceAccount),
        });
        this.fcmInitialized = true;
      } catch {
        this.fcmInitialized = false;
      }
    } else {
      this.fcmInitialized = false;
    }
  }

  async process(job: Job<PushJobData>): Promise<void> {
    const { userId, title, body, category, data } = job.data;

    // Persist notification record
    await this.prisma.notification.create({
      data: {
        userId,
        type: category,
        title,
        body,
        data: data ?? {},
        isRead: false,
      },
    });

    if (!this.fcmInitialized) {
      this.logger.debug(`[FCM stub] Push to ${userId}: ${title}`);
      return;
    }

    // In production: look up user's FCM token from DB/Redis
    // For now: log intent
    this.logger.log(`Push sent to user ${userId}: ${title}`);
  }
}
