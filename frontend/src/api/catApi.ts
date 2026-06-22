import { API_BASE_URL } from './config';

interface CatCountResponse {
  count: number;
}

export async function fetchCatCount(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/cat`);
  if (!res.ok) {
    throw new Error('Failed to fetch pet count');
  }
  const data: CatCountResponse = await res.json();
  return data.count;
}

export async function petTheCat(): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/cat/pet`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to pet the cat');
  }
  const data: CatCountResponse = await res.json();
  return data.count;
}
