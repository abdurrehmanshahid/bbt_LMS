import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { EmailModule } from './email/email.module';
import { KeysModule } from './keys/keys.module';
import { AuthModule } from './auth/auth.module';
import { TrackModule } from './track/track.module';
import { ContentModule } from './content/content.module';
import { AssessmentModule } from './assessment/assessment.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { CohortModule } from './cohort/cohort.module';
import { NotificationModule } from './notification/notification.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';
import { EmployerModule } from './employer/employer.module';

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
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
