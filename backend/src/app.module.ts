import { Module } from '@nestjs/common';
import { CatModule } from './cat/cat.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [CatModule, SearchModule],
})
export class AppModule {}
