import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LtiService } from './lti.service';
import { LtiController } from './lti.controller';
import { LtiListener } from './lti.listener';

@Module({
  imports: [HttpModule],
  providers: [LtiService, LtiListener],
  controllers: [LtiController],
  exports: [LtiService],
})
export class LtiModule {}
