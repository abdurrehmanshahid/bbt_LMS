import { Module } from '@nestjs/common';
import { EmployerService } from './employer.service';
import { EmployerController, BadgeVerifyController } from './employer.controller';

@Module({
  controllers: [EmployerController, BadgeVerifyController],
  providers: [EmployerService],
})
export class EmployerModule {}
