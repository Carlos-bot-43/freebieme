'use client';

import { useMemo, useState, useEffect } from 'react';
import { Deal, distanceMiles } from '../lib/types';
import DealCard from './DealCard';
import { Filters } from './FilterBar';
import { getSavedDealIds } from '../lib/savedDeals';

interface DealListProps {
  deals: Deal[];
  filters: Filters;
  userLat?: number;
  userLng?: number;
}

export default function DealList({ deals, filters, userLat, userLng }: DealListProps) {
  const hasLocation = !!(userLat && userLng);

  // Track saved IDs reactively (updates when savedOnly filter activates)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (filters.savedOnly) {
      setSavedIds(getSavedDealIds());
    }
  }, [filters.savedOnly]);

  const { displayed, filteredCount, nearbyCount } = useMemo(() => {
    let filtered = deals;

    // Saved only filter
    if (filters.savedOnly) {
      filtered = filtered.filter((d) => savedIds.has(d.deal_id));
    }

    // Search filter
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.location_name.toLowerCase().includes(q) ||
          (d.description || '').toLowerCase().includes(q) ||
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
        return distanceMiles(userLat!, userLng!, d.lat, d.lng) <= (filters.maxDistance as number);
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
      // Deduplicate: same restaurant + deal type within ~0.1 miles
      const seen = new Set<string>();
      const deduped: Deal[] = [];
      for (const deal of sorted) {
        const lat100 = deal.lat ? Math.round(deal.lat * 100) : 0;
        const lng100 = deal.lng ? Math.round(deal.lng * 100) : 0;
        const key = `${deal.chain_slug}_${deal.deal_type}_${lat100}_${lng100}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(deal);
        }
      }
      displayed = deduped.slice(0, 200);
    } else {
      // Interleave by chain for variety when no location
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

    return { displayed, filteredCount: filtered.length, nearbyCount };
  }, [deals, filters, hasLocation, userLat, userLng, savedIds]);

  if (displayed.length === 0) {
    // Build specific hints based on active filters
    const hints: string[] = [];
    if (filters.nearMe) hints.push('disable "Near Me" to see deals farther away');
    if (filters.maxDistance !== null) hints.push(`increase max distance (currently ${filters.maxDistance} mi)`);
    if (filters.dealType !== 'all') hints.push('select "All Deals" for more deal types');
    if (filters.requiresApp === 'no') hints.push('allow app deals');
    if (filters.requiresApp === 'yes') hints.push('allow non-app deals');
    if (filters.search.trim()) hints.push('clear your search text');

    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">🍽️</p>
        <p className="font-medium text-gray-700">
          {filters.savedOnly ? 'No saved deals in this city' : 'No deals match your filters'}
        </p>
        {filters.savedOnly ? (
          <p className="text-sm mt-2 text-gray-500">Star deals to save them — then find them here</p>
        ) : hints.length > 0 ? (
          <div className="mt-3 text-sm text-gray-500 max-w-xs mx-auto">
            <p className="mb-2">Try:</p>
            <ul className="text-left space-y-1 inline-block">
              {hints.map((hint, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-blue-400 mt-0.5">→</span>
                  <span className="capitalize-first">{hint.charAt(0).toUpperCase() + hint.slice(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm mt-1">Try adjusting your filters or search terms</p>
        )}
      </div>
    );
  }

  return (
    <div>
      {hasLocation && nearbyCount > 0 && !filters.nearMe && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
          <span className="text-green-600 text-lg">📍</span>
          <span className="text-sm font-medium text-green-800">
            {nearbyCount.toLocaleString()} deal{nearbyCount !== 1 ? 's' : ''} within 10 miles of you
          </span>
        </div>
      )}
      <p className="text-sm text-gray-500 mb-3">
        Showing <span className="font-medium text-gray-700">{displayed.length}</span> of{' '}
        <span className="font-medium text-gray-700">{filteredCount}</span> deals
        {hasLocation ? ' · sorted by distance' : ' · sorted by confidence'}
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
