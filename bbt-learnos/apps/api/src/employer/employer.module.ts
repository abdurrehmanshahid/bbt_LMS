import { Module } from '@nestjs/common';

import { EmployerController, BadgeVerifyController } from './employer.controller';
import { EmployerService } from './employer.service';

@Module({
  controllers: [EmployerController, BadgeVerifyController],
  providers: [EmployerService],
})
export class EmployerModule {}
