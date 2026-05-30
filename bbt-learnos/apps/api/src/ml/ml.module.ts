import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { MlService } from './ml.service';

@Module({
  imports: [HttpModule],
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
