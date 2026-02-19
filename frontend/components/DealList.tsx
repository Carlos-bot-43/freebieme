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

  // Distance filter
  if (filters.maxDistance !== null && userLat && userLng) {
    filtered = filtered.filter((d) => {
      if (!d.lat || !d.lng) return true;
      const dist = distanceMiles(userLat, userLng, d.lat, d.lng);
      return dist <= (filters.maxDistance as number);
    });
  }

  // Sort: if user has location, sort by distance; else by confidence
  if (userLat && userLng) {
    filtered = filtered.sort((a, b) => {
      const da = a.lat && a.lng ? distanceMiles(userLat, userLng, a.lat, a.lng) : 999;
      const db = b.lat && b.lng ? distanceMiles(userLat, userLng, b.lat, b.lng) : 999;
      return da - db;
    });
  } else {
    filtered = filtered.sort((a, b) => b.confidence_score - a.confidence_score);
  }

  // Deduplicate: don't show 10 deals for the same Starbucks in a row
  // Group by location, then interleave by chain
  const byChain: Record<string, Deal[]> = {};
  for (const deal of filtered) {
    if (!byChain[deal.chain_slug]) byChain[deal.chain_slug] = [];
    byChain[deal.chain_slug].push(deal);
  }

  // Interleave: take one from each chain in rotation
  const interleaved: Deal[] = [];
  const chains = Object.keys(byChain);
  const maxLen = Math.max(...chains.map((c) => byChain[c].length));
  for (let i = 0; i < maxLen; i++) {
    for (const chain of chains) {
      if (byChain[chain][i]) interleaved.push(byChain[chain][i]);
    }
  }

  const displayed = interleaved.slice(0, 200); // Cap at 200 for performance

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
      <p className="text-sm text-gray-500 mb-3">
        Showing <span className="font-medium text-gray-700">{displayed.length}</span> of{' '}
        <span className="font-medium text-gray-700">{filtered.length}</span> deals
        {userLat && userLng ? ', sorted by distance' : ', sorted by confidence'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
