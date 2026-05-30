import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';

import { SearchService } from './search.service';

@Controller('search')
@UseGuards(OptionalJwtGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') q: string = '',
    @Query('trackId') trackId?: string,
    @Query('type') type?: string,
    @Query('after') after?: string,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.searchService.search(q, {
      ...(trackId ? { trackId } : {}),
      ...(type ? { type } : {}),
      ...(after ? { after } : {}),
      ...(user ? { userId: user.sub } : {}),
    });
  }
}
