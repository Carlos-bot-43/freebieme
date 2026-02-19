'use client';

import { Deal, distanceMiles } from '../lib/types';
import DealCard from './DealCard';
import { Filters } from './FilterBar';

interface DealListProps {
  deals: Deal[];
  filters: Filters;
  userLat?: number;
  userLng?: number;
}

export default function DealList({ deals, filters, userLat, userLng }: DealListProps) {
  const hasLocation = !!(userLat && userLng);

  // Apply filters
  let filtered = deals;

  // Search filter
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.location_name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.chain_slug.toLowerCase().includes(q)
    );
  }

  // Deal type filter
  if (filters.dealType !== 'all') {
    filtered = filtered.filter((d) => d.deal_type === filters.dealType);
  }

  // App requirement filter
  if (filters.requiresApp === 'yes') {
    filtered = filtered.filter((d) => d.requires_app);
  } else if (filters.requiresApp === 'no') {
    filtered = filtered.filter((d) => !d.requires_app);
  }

  // Near Me filter (≤5 miles)
  if (filters.nearMe && hasLocation) {
    filtered = filtered.filter((d) => {
      if (!d.lat || !d.lng) return false;
      return distanceMiles(userLat!, userLng!, d.lat, d.lng) <= 5;
    });
  }

  // Max distance filter
  if (filters.maxDistance !== null && hasLocation) {
    filtered = filtered.filter((d) => {
      if (!d.lat || !d.lng) return true;
      const dist = distanceMiles(userLat!, userLng!, d.lat, d.lng);
      return dist <= (filters.maxDistance as number);
    });
  }

  // Sort: if user has location, sort strictly by distance; else by confidence
  const sorted = [...filtered].sort((a, b) => {
    if (hasLocation) {
      const da = a.lat && a.lng ? distanceMiles(userLat!, userLng!, a.lat, a.lng) : 999;
      const db = b.lat && b.lng ? distanceMiles(userLat!, userLng!, b.lat, b.lng) : 999;
      return da - db;
    }
    return b.confidence_score - a.confidence_score;
  });

  let displayed: Deal[];

  if (hasLocation) {
    // When sorted by distance, show strictly sorted (no interleaving)
    // Deduplicate exact same deal_type+chain_slug within 0.1 miles (same restaurant)
    const seen = new Set<string>();
    const deduped: Deal[] = [];
    for (const deal of sorted) {
      const key = `${deal.chain_slug}_${deal.deal_type}_${Math.round(deal.lat * 100)}_${Math.round(deal.lng * 100)}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(deal);
      }
    }
    displayed = deduped.slice(0, 200);
  } else {
    // When sorted by confidence, interleave by chain for variety
    const byChain: Record<string, Deal[]> = {};
    for (const deal of sorted) {
      if (!byChain[deal.chain_slug]) byChain[deal.chain_slug] = [];
      byChain[deal.chain_slug].push(deal);
    }
    const chains = Object.keys(byChain);
    const interleaved: Deal[] = [];
    const maxLen = chains.length > 0 ? Math.max(...chains.map((c) => byChain[c].length)) : 0;
    for (let i = 0; i < maxLen; i++) {
      for (const chain of chains) {
        if (byChain[chain][i]) interleaved.push(byChain[chain][i]);
      }
    }
    displayed = interleaved.slice(0, 200);
  }

  // Count deals within 10 miles
  const nearbyCount = hasLocation
    ? deals.filter((d) => d.lat && d.lng && distanceMiles(userLat!, userLng!, d.lat, d.lng) <= 10).length
    : 0;

  if (displayed.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="font-medium">No deals found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div>
      {hasLocation && nearbyCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-green-600 text-lg">📍</span>
          <span className="text-sm font-medium text-green-800">
            {nearbyCount.toLocaleString()} deal{nearbyCount !== 1 ? 's' : ''} within 10 miles of you
          </span>
        </div>
      )}
      <p className="text-sm text-gray-500 mb-3">
        Showing <span className="font-medium text-gray-700">{displayed.length}</span> of{' '}
        <span className="font-medium text-gray-700">{filtered.length}</span> deals
        {hasLocation ? ', sorted by distance' : ', sorted by confidence'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {displayed.map((deal) => (
          <DealCard
            key={deal.deal_id}
            deal={deal}
            userLat={userLat}
            userLng={userLng}
          />
        ))}
      </div>
    </div>
  );
}
