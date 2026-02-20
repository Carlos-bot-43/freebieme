// Shared types and constants — safe for both client and server

export interface Deal {
  deal_id: string;
  title: string;
  description: string;
  deal_type: string;
  free_item: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  requires_app: boolean;
  requires_signup: boolean;
  requires_purchase: boolean;
  coupon_code: string | null;
  confidence_score: number;
  source_url: string;
  is_recurring: boolean;
  chain_slug: string;
  location_name: string;
  address: string | null;
  city: string;
  state: string | null;
  zip: string | null;
  lat: number;
  lng: number;
  phone: string | null;
  opening_hours: string | null;
  food_tags: string[]; // deal-level food categories, computed at data generation
  claim_type: 'instant' | 'same_day_setup' | 'advance_required' | 'birthday_only';
  claim_steps: string[];
  value_summary: string; // "Free Whopper" or "50% off drinks 2–4 PM" or "Points toward free food"
  happy_hour_start?: string;   // "14:00"
  happy_hour_end?: string;     // "16:00"
  happy_hour_days?: string;    // "every day" | "Mon–Fri"
  happy_hour_note?: string;
}

export interface CityDeals {
  city_slug: string;
  deal_count: number;
  updated_at: string;
  deals: Deal[];
}

export interface CityConfig {
  slug: string;
  name: string;
  display: string;
  center: { lat: number; lng: number };
  bbox: { min_lat: number; max_lat: number; min_lng: number; max_lng: number };
  population: number;
  priority: number;
}

export interface DealGroup {
  group_id: string; // chain_slug + '_' + deal_type
  chain_slug: string;
  location_name: string; // e.g., "Chipotle"
  title: string;
  description: string;
  deal_type: string;
  free_item: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  requires_app: boolean;
  requires_signup: boolean;
  requires_purchase: boolean;
  coupon_code: string | null;
  confidence_score: number;
  source_url: string;
  is_recurring: boolean;
  locations: Array<{ address: string | null; lat: number; lng: number; phone: string | null; deal_id: string }>;
  nearestDistance: number | null; // miles, null if no user location
  nearestLocation: { address: string | null; lat: number; lng: number } | null;
  food_tags: string[]; // from the group's deals (all same since same chain+deal_type)
  claim_type: 'instant' | 'same_day_setup' | 'advance_required' | 'birthday_only';
  claim_steps: string[];
  value_summary: string; // "Free Whopper" or "50% off drinks 2–4 PM" or "Points toward free food"
  happy_hour_start?: string;
  happy_hour_end?: string;
  happy_hour_days?: string;
  happy_hour_note?: string;
}

// Calculate distance in miles between two lat/lng points
export function distanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function groupDeals(deals: Deal[], userLat?: number, userLng?: number): DealGroup[] {
  const groups = new Map<string, DealGroup>();

  for (const deal of deals) {
    const key = `${deal.chain_slug}_${deal.deal_type}`;
    if (!groups.has(key)) {
      groups.set(key, {
        group_id: key,
        chain_slug: deal.chain_slug,
        location_name: deal.location_name,
        title: deal.title,
        description: deal.description,
        deal_type: deal.deal_type,
        free_item: deal.free_item,
        discount_percent: deal.discount_percent,
        discount_amount: deal.discount_amount,
        requires_app: deal.requires_app,
        requires_signup: deal.requires_signup,
        requires_purchase: deal.requires_purchase,
        coupon_code: deal.coupon_code,
        confidence_score: deal.confidence_score,
        source_url: deal.source_url,
        is_recurring: deal.is_recurring,
        locations: [],
        nearestDistance: null,
        nearestLocation: null,
        food_tags: deal.food_tags || [],
        claim_type: deal.claim_type || 'same_day_setup',
        claim_steps: deal.claim_steps || [],
        value_summary: deal.value_summary || '',
        happy_hour_start: deal.happy_hour_start,
        happy_hour_end: deal.happy_hour_end,
        happy_hour_days: deal.happy_hour_days,
        happy_hour_note: deal.happy_hour_note,
      });
    }
    const group = groups.get(key)!;
    const dist = (userLat && userLng) ? distanceMiles(userLat, userLng, deal.lat, deal.lng) : null;
    group.locations.push({ address: deal.address, lat: deal.lat, lng: deal.lng, phone: deal.phone, deal_id: deal.deal_id });
    if (dist !== null && (group.nearestDistance === null || dist < group.nearestDistance)) {
      group.nearestDistance = dist;
      group.nearestLocation = { address: deal.address, lat: deal.lat, lng: deal.lng };
    }
  }

  const result = Array.from(groups.values());

  // Claim type priority — actionability-first ordering
  const CLAIM_PRIORITY: Record<string, number> = {
    instant: 0,          // Use right now — best
    same_day_setup: 1,   // ~10 min setup — great
    birthday_only: 2,    // Need birthday month — relevant but conditional
    advance_required: 3, // Rewards programs — long-term, least urgent
  };

  // Sort: by nearest distance if available, else by actionability + confidence_score
  if (userLat && userLng) {
    result.sort((a, b) => {
      if (a.nearestDistance === null) return 1;
      if (b.nearestDistance === null) return -1;
      return a.nearestDistance - b.nearestDistance;
    });
  } else {
    result.sort((a, b) => {
      const pa = CLAIM_PRIORITY[a.claim_type] ?? 3;
      const pb = CLAIM_PRIORITY[b.claim_type] ?? 3;
      if (pa !== pb) return pa - pb; // Actionable deals first
      return b.confidence_score - a.confidence_score; // Then by confidence
    });
  }

  return result;
}

export const DEAL_TYPE_LABELS: Record<string, string> = {
  birthday: '🎂 Birthday',
  signup_bonus: '🎁 Sign Up Bonus',
  app_deal: '📱 App Deal',
  bogo: '2️⃣ BOGO',
  happy_hour: '🕐 Happy Hour',
  rewards_program: '⭐ Rewards',
  freebie: '🆓 Free Item',
  discount: '💰 Discount',
  other: '🍽️ Deal',
};

export const DEAL_TYPE_COLORS: Record<string, string> = {
  birthday: 'bg-pink-100 text-pink-800',
  signup_bonus: 'bg-purple-100 text-purple-800',
  app_deal: 'bg-blue-100 text-blue-800',
  bogo: 'bg-orange-100 text-orange-800',
  happy_hour: 'bg-yellow-100 text-yellow-800',
  rewards_program: 'bg-green-100 text-green-800',
  freebie: 'bg-emerald-100 text-emerald-800',
  discount: 'bg-red-100 text-red-800',
  other: 'bg-gray-100 text-gray-800',
};
