import { Controller, Get, Query } from '@nestjs/common';
import { SearchService, SearchResult } from './search.service';

@Controller('api/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query('q') q?: string): SearchResult[] {
    return this.searchService.search(q ?? '');
  }
}
