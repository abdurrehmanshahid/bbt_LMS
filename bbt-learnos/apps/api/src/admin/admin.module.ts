import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SearchModule } from '../search/search.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [PrismaModule, SearchModule, AnalyticsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
