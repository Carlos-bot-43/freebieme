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

export function getChainCount(): number {
  try {
    const chainsPath = path.join(process.cwd(), '..', 'data', 'chains.json');
    const chains = JSON.parse(fs.readFileSync(chainsPath, 'utf-8'));
    return chains.length;
  } catch {
    return 0;
  }
}

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

export interface HotDealPreview {
  category: string;          // "burger" | "pizza" | "chicken" | "coffee" | "birthday" | "happy_hour"
  citySlug: string;
  cityName: string;
  chainName: string;
  emoji: string;
  valueSummary: string;
  claimType: string;
}

const HOT_DEAL_TARGETS: Array<{
  category: string;
  emoji: string;
  preferCities: string[];
  matchFn: (deal: { deal_type: string; food_tags?: string[]; claim_type: string; value_summary: string }) => boolean;
}> = [
  {
    category: 'burger',
    emoji: '🍔',
    preferCities: ['new-york-ny', 'chicago-il', 'los-angeles-ca', 'houston-tx'],
    matchFn: (d) =>
      d.claim_type !== 'advance_required' &&
      (d.food_tags || []).includes('burgers') &&
      !['birthday', 'rewards_program'].includes(d.deal_type) &&
      !!d.value_summary,
  },
  {
    category: 'pizza',
    emoji: '🍕',
    preferCities: ['chicago-il', 'new-york-ny', 'los-angeles-ca', 'houston-tx'],
    matchFn: (d) =>
      d.claim_type !== 'advance_required' &&
      (d.food_tags || []).includes('pizza') &&
      !['birthday', 'rewards_program'].includes(d.deal_type) &&
      !!d.value_summary,
  },
  {
    category: 'chicken',
    emoji: '🍗',
    preferCities: ['los-angeles-ca', 'houston-tx', 'chicago-il', 'new-york-ny'],
    matchFn: (d) =>
      d.claim_type !== 'advance_required' &&
      ((d.food_tags || []).includes('chicken') || (d.food_tags || []).includes('wings')) &&
      !['birthday', 'rewards_program'].includes(d.deal_type) &&
      !!d.value_summary,
  },
  {
    category: 'coffee',
    emoji: '☕',
    preferCities: ['houston-tx', 'chicago-il', 'los-angeles-ca', 'new-york-ny'],
    matchFn: (d) =>
      d.claim_type !== 'advance_required' &&
      ((d.food_tags || []).includes('coffee') || (d.food_tags || []).includes('drinks')) &&
      !['birthday', 'rewards_program', 'happy_hour'].includes(d.deal_type) &&
      !!d.value_summary,
  },
  {
    category: 'birthday',
    emoji: '🎂',
    preferCities: ['chicago-il', 'houston-tx', 'los-angeles-ca', 'new-york-ny'],
    matchFn: (d) =>
      d.deal_type === 'birthday' &&
      !!d.value_summary,
  },
  {
    category: 'happy_hour',
    emoji: '🕐',
    preferCities: ['houston-tx', 'chicago-il', 'new-york-ny', 'los-angeles-ca'],
    matchFn: (d) =>
      d.deal_type === 'happy_hour' &&
      d.claim_type === 'instant' &&
      !!d.value_summary,
  },
];

export function getHotDealsPreview(cityConfigs: CityConfig[]): HotDealPreview[] {
  const dealsDir = getDealsDir();
  const cityNameMap = new Map(cityConfigs.map((c) => [c.slug, c.name]));
  const results: HotDealPreview[] = [];
  const usedCities = new Set<string>();

  for (const target of HOT_DEAL_TARGETS) {
    let found = false;
    for (const citySlug of target.preferCities) {
      if (found) break;
      // Allow duplicate cities only if we're running low on options
      try {
        const filePath = path.join(dealsDir, `${citySlug}.json`);
        if (!fs.existsSync(filePath)) continue;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const seenChains = new Set<string>();
        for (const deal of (data.deals || [])) {
          const key = `${deal.chain_slug}_${deal.deal_type}`;
          if (seenChains.has(key)) continue;
          seenChains.add(key);
          if (target.matchFn(deal)) {
            results.push({
              category: target.category,
              citySlug,
              cityName: cityNameMap.get(citySlug) || citySlug,
              chainName: deal.location_name,
              emoji: target.emoji,
              valueSummary: deal.value_summary,
              claimType: deal.claim_type,
            });
            usedCities.add(citySlug);
            found = true;
            break;
          }
        }
      } catch { /* skip on error */ }
    }
  }

  return results;
}

// Count unique deal groups across all cities (chain_slug + deal_type combinations)
export function getUniqueDealGroupCount(): number {
  try {
    const dealsDir = getDealsDir();
    if (!fs.existsSync(dealsDir)) return 0;
    const groups = new Set<string>();
    for (const file of fs.readdirSync(dealsDir).filter(f => f.endsWith('.json'))) {
      const data: CityDeals = JSON.parse(fs.readFileSync(path.join(dealsDir, file), 'utf-8'));
      for (const deal of (data.deals || [])) {
        groups.add(`${deal.chain_slug}_${deal.deal_type}`);
      }
    }
    return groups.size;
  } catch {
    return 0;
  }
}
