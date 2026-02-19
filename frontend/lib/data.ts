// data.ts — SERVER ONLY (uses Node.js fs/path — do not import in client components)
// Import types from ./types instead

import fs from 'fs';
import path from 'path';
import type { CityConfig, CityDeals } from './types';

// At build time, deal data lives in frontend/public/data/deals/
// In local dev (before truncate-for-public), fallback to data/output/deals/
const PUBLIC_DEALS_DIR = path.join(process.cwd(), 'public', 'data', 'deals');
const OUTPUT_DEALS_DIR = path.join(process.cwd(), '..', 'data', 'output', 'deals');

function getDealsDir(): string {
  if (fs.existsSync(PUBLIC_DEALS_DIR)) return PUBLIC_DEALS_DIR;
  return OUTPUT_DEALS_DIR;
}

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
    const dealsDir = getDealsDir();
    const filePath = path.join(dealsDir, `${citySlug}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

export function getAvailableCities(): string[] {
  try {
    const dealsDir = getDealsDir();
    if (!fs.existsSync(dealsDir)) return [];
    return fs.readdirSync(dealsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  } catch {
    return [];
  }
}

// Get deal count for a city (used at build time for homepage stats)
export function getCityDealCount(citySlug: string): number {
  try {
    const dealsDir = getDealsDir();
    const filePath = path.join(dealsDir, `${citySlug}.json`);
    if (!fs.existsSync(filePath)) return 0;
    const data: CityDeals = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data.deal_count ?? data.deals?.length ?? 0;
  } catch {
    return 0;
  }
}
