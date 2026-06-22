import { Injectable } from '@nestjs/common';

export interface SearchResult {
  title: string;
  path: string;
}

const PAGES: SearchResult[] = [
  { title: 'home', path: '/' },
  { title: 'gallery', path: '/gallery' },
  { title: 'pet the cat', path: '/gallery' },
  { title: 'about me', path: '/about' },
  { title: 'my sona', path: '/about/sona' },
  { title: 'my links', path: '/about/links' },
  { title: 'more info', path: '/about/more' },
  { title: 'confidential', path: '/confidential' },
];

@Injectable()
export class SearchService {
  search(query: string): SearchResult[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return PAGES.filter((page) => page.title.toLowerCase().includes(normalized));
  }
}
