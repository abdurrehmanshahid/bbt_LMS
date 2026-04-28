import {
  Controller, Get, Post, Delete, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FranchiseService } from './franchise.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('franchise')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('FRANCHISE_OWNER', 'ADMIN')
export class FranchiseController {
  constructor(private readonly franchiseService: FranchiseService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.franchiseService.getDashboard(user.sub);
  }

  @Get('learners')
  getLearners(
    @CurrentUser() user: JwtPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.franchiseService.getLearners(
      user.sub,
      Math.max(1, Number(page ?? 1)),
      Math.min(50, Number(limit ?? 20)),
    );
  }

  @Post('learners/:learnerId')
  assignLearner(@CurrentUser() user: JwtPayload, @Param('learnerId') learnerId: string) {
    return this.franchiseService.assignLearner(user.sub, learnerId);
  }

  @Delete('learners/:learnerId')
  @HttpCode(HttpStatus.OK)
  removeLearner(@CurrentUser() user: JwtPayload, @Param('learnerId') learnerId: string) {
    return this.franchiseService.removeLearner(user.sub, learnerId);
  }

  @Get('compliance')
  getCompliance(@CurrentUser() user: JwtPayload) {
    return this.franchiseService.getCompliance(user.sub);
  }

  @Post('compliance/:itemId/toggle')
  toggleComplianceItem(@CurrentUser() user: JwtPayload, @Param('itemId') itemId: string) {
    return this.franchiseService.toggleComplianceItem(user.sub, itemId);
  }
}
