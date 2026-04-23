import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';
import { OptionalJwtGuard } from '../common/guards/optional-jwt.guard';

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
  ) {
    return this.searchService.search(q, {
      ...(trackId ? { trackId } : {}),
      ...(type ? { type } : {}),
      ...(after ? { after } : {}),
    });
  }
}
