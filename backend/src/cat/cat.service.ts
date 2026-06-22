import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

interface CatData {
  count: number;
}

const DATA_FILE = join(__dirname, '..', '..', 'data', 'cat-pets.json');

@Injectable()
export class CatService {
  private count: number;

  constructor() {
    this.count = this.loadCount();
  }

  getCount(): number {
    return this.count;
  }

  pet(): number {
    this.count += 1;
    this.saveCount();
    return this.count;
  }

  private loadCount(): number {
    try {
      if (existsSync(DATA_FILE)) {
        const raw = readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw) as CatData;
        return typeof data.count === 'number' ? data.count : 0;
      }
    } catch {
      // corrupt or unreadable file - fall back to 0 below
    }
    return 0;
  }

  private saveCount(): void {
    try {
      mkdirSync(dirname(DATA_FILE), { recursive: true });
      const data: CatData = { count: this.count };
      writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch {
      // best-effort persistence; an in-memory count still works this session
    }
  }
}
