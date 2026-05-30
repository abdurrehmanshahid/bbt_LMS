import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { KeysModule } from '../keys/keys.module';

import { CohortController } from './cohort.controller';
import { CohortGateway } from './cohort.gateway';
import { CohortService } from './cohort.service';

@Module({
  imports: [AuthModule, KeysModule],
  providers: [CohortService, CohortGateway],
  controllers: [CohortController],
  exports: [CohortService],
})
export class CohortModule {}
