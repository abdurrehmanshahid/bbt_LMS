import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { LtiController } from './lti.controller';
import { LtiListener } from './lti.listener';
import { LtiService } from './lti.service';

@Module({
  imports: [HttpModule],
  providers: [LtiService, LtiListener],
  controllers: [LtiController],
  exports: [LtiService],
})
export class LtiModule {}
