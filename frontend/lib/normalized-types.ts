// Normalized schema mirror — must stay in sync with /lib/schema.js
// Imported by frontend code that consumes the new normalized DB.

export type VerificationMethod =
  | 'baseline'
  | 'http'
  | 'content'
  | 'meta'
  | 'reddit'
  | 'slickdeals'
  | 'newsletter'
  | 'user-reported';

export type Recurrence = 'once' | 'weekly' | 'annual' | 'ongoing';

export type ClaimType = 'instant' | 'same_day_setup' | 'advance_required' | 'birthday_only';

export interface NormalizedChain {
  slug: string;
  name: string;
  rewards_url: string;
  cuisine: string[];
  food_categories: string[];
}

export interface NormalizedDeal {
  deal_id: string;
  chain_slug: string;
  deal_type: string;
  title: string;
  description: string;
  free_item: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  requires_app: boolean;
  requires_signup: boolean;
  requires_purchase: boolean;
  source_url: string;
  source_type: string;
  recurrence: Recurrence;
  valid_from: string | null;
  valid_until: string | null;
  confidence_score: number;
  verification_method: VerificationMethod;
  last_verified_at: string;
  first_seen_at: string;
  claim_type: ClaimType;
  claim_steps: string[];
  value_summary: string;
  food_tags: string[];
  happy_hour_start?: string;
  happy_hour_end?: string;
  happy_hour_days?: string;
  happy_hour_note?: string;
}

export interface NormalizedLocation {
  location_id: string;
  chain_slug: string;
  city_slug: string;
  address: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  opening_hours: string | null;
}

export interface NormalizedDB {
  schema_version: string;
  generated_at: string;
  chains: NormalizedChain[];
  deals: NormalizedDeal[];
  locations: NormalizedLocation[];
  offers: unknown[];
}

export type ConfidenceBucket = 'verified' | 'likely' | 'unverified';

export function confidenceBucket(score: number): ConfidenceBucket {
  if (score >= 0.9) return 'verified';
  if (score >= 0.7) return 'likely';
  return 'unverified';
}

export function daysSince(isoTimestamp: string | null | undefined): number | null {
  if (!isoTimestamp) return null;
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
}

export function freshnessLabel(isoTimestamp: string | null | undefined): string | null {
  const d = daysSince(isoTimestamp);
  if (d === null) return null;
  if (d <= 1) return 'today';
  if (d <= 7) return `${d}d ago`;
  if (d <= 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
