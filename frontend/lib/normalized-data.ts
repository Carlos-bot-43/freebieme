// Server-only helpers for reading the slim normalized DB at build time.
// Keeps the generated JSON close to the rest of the data layer.

import fs from 'fs';
import path from 'path';
import type {
  NormalizedDB,
  NormalizedChain,
  NormalizedDeal,
} from './normalized-types';

const SLIM_DB_PATH = path.join(process.cwd(), 'public', 'data', 'db.json');
const FALLBACK_DB_PATH = path.join(process.cwd(), '..', 'data', 'normalized', 'db.json');

interface SlimDB extends NormalizedDB {
  location_counts_by_chain?: Record<string, number>;
  location_counts_by_chain_city?: Record<string, number>;
}

let cached: SlimDB | null = null;

export function loadDB(): SlimDB | null {
  if (cached) return cached;
  for (const p of [SLIM_DB_PATH, FALLBACK_DB_PATH]) {
    try {
      if (!fs.existsSync(p)) continue;
      cached = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return cached;
    } catch {
      continue;
    }
  }
  return null;
}

export function getAllChains(): NormalizedChain[] {
  const db = loadDB();
  return db?.chains ?? [];
}

export function getChain(slug: string): NormalizedChain | null {
  return getAllChains().find(c => c.slug === slug) ?? null;
}

export function getDealsForChain(slug: string): NormalizedDeal[] {
  const db = loadDB();
  return (db?.deals ?? []).filter(d => d.chain_slug === slug);
}

export function getLocationCountForChain(slug: string): number {
  const db = loadDB();
  return db?.location_counts_by_chain?.[slug] ?? 0;
}

export function getLocationCountForChainCity(chainSlug: string, citySlug: string): number {
  const db = loadDB();
  return db?.location_counts_by_chain_city?.[`${chainSlug}__${citySlug}`] ?? 0;
}

export function getAllDeals(): NormalizedDeal[] {
  const db = loadDB();
  return db?.deals ?? [];
}

// Build a list of (chainSlug, citySlug) pairs that actually have locations.
// Used for static-param generation on chain × city routes.
export function getChainCityPairs(): { chain: string; city: string }[] {
  const db = loadDB();
  const out: { chain: string; city: string }[] = [];
  if (!db?.location_counts_by_chain_city) return out;
  for (const key of Object.keys(db.location_counts_by_chain_city)) {
    const [chain, city] = key.split('__');
    if (chain && city) out.push({ chain, city });
  }
  return out;
}
