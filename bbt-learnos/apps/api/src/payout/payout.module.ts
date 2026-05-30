import { Module } from '@nestjs/common';

import { NotificationModule } from '../notification/notification.module';
import { PrismaModule } from '../prisma/prisma.module';

import { PayoutController } from './payout.controller';
import { PayoutService } from './payout.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  providers: [PayoutService],
  controllers: [PayoutController],
  exports: [PayoutService],
})
export class PayoutModule {}
