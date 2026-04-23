import { Module } from '@nestjs/common';
import { CohortService } from './cohort.service';
import { CohortController } from './cohort.controller';
import { CohortGateway } from './cohort.gateway';
import { AuthModule } from '../auth/auth.module';
import { KeysModule } from '../keys/keys.module';

@Module({
  imports: [AuthModule, KeysModule],
  providers: [CohortService, CohortGateway],
  controllers: [CohortController],
  exports: [CohortService],
})
export class CohortModule {}
