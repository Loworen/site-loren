import { Controller, Get, Post } from '@nestjs/common';
import { CatService } from './cat.service';

interface CatCountResponse {
  count: number;
}

@Controller('api/cat')
export class CatController {
  constructor(private readonly catService: CatService) {}

  @Get()
  getCount(): CatCountResponse {
    return { count: this.catService.getCount() };
  }

  @Post('pet')
  petCat(): CatCountResponse {
    return { count: this.catService.pet() };
  }
}
