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
