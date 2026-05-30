import { Module } from '@nestjs/common';

import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

@Module({
  providers: [EnrollmentService],
  controllers: [EnrollmentController],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
