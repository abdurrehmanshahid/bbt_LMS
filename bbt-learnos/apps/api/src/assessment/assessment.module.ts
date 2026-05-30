import { Module } from '@nestjs/common';

import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';

@Module({
  providers: [AssessmentService],
  controllers: [AssessmentController],
  exports: [AssessmentService],
})
export class AssessmentModule {}
