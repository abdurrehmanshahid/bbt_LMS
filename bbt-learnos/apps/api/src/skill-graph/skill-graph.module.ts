import { Module } from '@nestjs/common';

import { SkillGraphController } from './skill-graph.controller';
import { SkillGraphService } from './skill-graph.service';

@Module({
  providers: [SkillGraphService],
  controllers: [SkillGraphController],
  exports: [SkillGraphService],
})
export class SkillGraphModule {}
