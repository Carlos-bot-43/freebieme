// data.ts — SERVER ONLY (uses Node.js fs/path — do not import in client components)
// Import types from ./types instead

import fs from 'fs';
import path from 'path';
import type { CityConfig, CityDeals } from './types';

const DATA_BASE = path.join(process.cwd(), '..', 'data', 'output');

export type { CityConfig, CityDeals };
export { distanceMiles, DEAL_TYPE_LABELS, DEAL_TYPE_COLORS } from './types';
export type { Deal } from './types';

export function getCities(): CityConfig[] {
  try {
    const citiesPath = path.join(process.cwd(), '..', 'data', 'cities.json');
    return JSON.parse(fs.readFileSync(citiesPath, 'utf-8'));
  } catch {
    return [];
  }
}

export function getCityDeals(citySlug: string): CityDeals | null {
  try {
    const filePath = path.join(DATA_BASE, 'deals', `${citySlug}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function getAvailableCities(): string[] {
  try {
    const dealsDir = path.join(DATA_BASE, 'deals');
    if (!fs.existsSync(dealsDir)) return [];
    return fs.readdirSync(dealsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}
