import { API_BASE_URL } from './config';

export interface SearchResult {
  title: string;
  path: string;
}

export async function searchSite(query: string): Promise<SearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) {
    throw new Error('Search failed');
  }
  return res.json();
}
