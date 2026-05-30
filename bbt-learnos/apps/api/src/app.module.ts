import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AssessmentModule } from './assessment/assessment.module';
import { AuthModule } from './auth/auth.module';
import { CohortModule } from './cohort/cohort.module';
import { ContentModule } from './content/content.module';
import { EmailModule } from './email/email.module';
import { EmployerModule } from './employer/employer.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { FranchiseModule } from './franchise/franchise.module';
import { KeysModule } from './keys/keys.module';
import { LiveSessionModule } from './live-session/live-session.module';
import { LtiModule } from './lti/lti.module';
import { MentorshipModule } from './mentorship/mentorship.module';
import { ModerationModule } from './moderation/moderation.module';
import { Neo4jModule } from './neo4j/neo4j.module';
import { NotificationModule } from './notification/notification.module';
import { PayoutModule } from './payout/payout.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SearchModule } from './search/search.module';
import { SkillGraphModule } from './skill-graph/skill-graph.module';
import { SocialModule } from './social/social.module';
import { TrackModule } from './track/track.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', maxListeners: 20 }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    Neo4jModule,
    EmailModule,
    KeysModule,
    AuthModule,
    TrackModule,
    ContentModule,
    AssessmentModule,
    EnrollmentModule,
    CohortModule,
    NotificationModule,
    SearchModule,
    AdminModule,
    EmployerModule,
    LtiModule,
    ModerationModule,
    AnalyticsModule,
    LiveSessionModule,
    MentorshipModule,
    SocialModule,
    FranchiseModule,
    PayoutModule,
    SkillGraphModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
