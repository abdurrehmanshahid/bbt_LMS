import { Module } from '@nestjs/common';

import { AnalyticsModule } from '../analytics/analytics.module';
import { PrismaModule } from '../prisma/prisma.module';

import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [PrismaModule, AnalyticsModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
