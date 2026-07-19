'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Deal, DealGroup, groupDeals } from '../lib/types';
import DealGroupCard from './DealGroupCard';
import { Filters } from './FilterBar';
import { getSavedDealIds } from '../lib/savedDeals';

const INITIAL_VISIBLE = 20;
const LOAD_MORE_COUNT = 20;

interface DealListProps {
  deals: Deal[];
  filters: Filters;
  userLat?: number;
  userLng?: number;
  updatedAt?: string;
  cityName?: string;
  citySlug?: string; // for "browse all" link in no-results state
}

export default function DealList({ deals, filters, userLat, userLng, updatedAt, cityName, citySlug }: DealListProps) {
  const hasLocation = !!(userLat && userLng);

  // 5B: Lazy loading state
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [filters]);

  // Track saved IDs reactively (updates when savedOnly filter activates)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (filters.savedOnly) {
      setSavedIds(getSavedDealIds());
    }
  }, [filters.savedOnly]);

  // Group deals by chain_slug + deal_type
  const allGroups = useMemo(() => {
    return groupDeals(deals, userLat, userLng);
  }, [deals, userLat, userLng]);

  const { displayed, filteredCount } = useMemo(() => {
    let filtered: DealGroup[] = allGroups;

    // Saved only filter — check if any location's deal_id is saved
    if (filters.savedOnly) {
      filtered = filtered.filter((g) => g.locations.some((loc) => savedIds.has(loc.deal_id)));
    }

    // Food category filter — uses deal-level food_tags (not chain-level lookup)
    if (filters.foodCategory) {
      filtered = filtered.filter((g) =>
        (g.food_tags || []).includes(filters.foodCategory)
      );
    }

    // Search filter — match chain slug, location name, title, description, and food tags
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((g) => {
        return (
          g.title.toLowerCase().includes(q) ||
          g.location_name.toLowerCase().includes(q) ||
          (g.description || '').toLowerCase().includes(q) ||
          g.chain_slug.toLowerCase().includes(q) ||
          (g.food_tags || []).some((t) => t.includes(q))
        );
      });
    }

    // Deal type filter
    if (filters.dealType !== 'all') {
      filtered = filtered.filter((g) => g.deal_type === filters.dealType);
    }

    // App requirement filter
    if (filters.requiresApp === 'yes') {
      filtered = filtered.filter((g) => g.requires_app);
    } else if (filters.requiresApp === 'no') {
      filtered = filtered.filter((g) => !g.requires_app);
    }

    // Near Me filter (≤5 miles using nearestDistance)
    if (filters.nearMe && hasLocation) {
      filtered = filtered.filter((g) => g.nearestDistance !== null && g.nearestDistance <= 5);
    }

    // Max distance filter
    if (filters.maxDistance !== null && hasLocation) {
      filtered = filtered.filter((g) => g.nearestDistance !== null && g.nearestDistance <= (filters.maxDistance as number));
    }

    // Claim type filter
    if (filters.claimType) {
      filtered = filtered.filter((g) => g.claim_type === filters.claimType);
    }

    // No app needed filter
    if (filters.noApp) {
      filtered = filtered.filter((g) => !g.requires_app);
    }

    return { displayed: filtered, filteredCount: filtered.length };
  }, [allGroups, filters, hasLocation, savedIds]);

  const totalLocations = useMemo(() => {
    return displayed.reduce((sum, g) => sum + g.locations.length, 0);
  }, [displayed]);

  // 5B: Lazy slice
  const visibleGroups = displayed.slice(0, visibleCount);
  const hasMore = visibleCount < displayed.length;

  // 6C: Better "no deals" state
  if (displayed.length === 0) {
    const hints: string[] = [];
    if (filters.nearMe) hints.push('disable "Near Me" to see deals farther away');
    if (filters.maxDistance !== null) hints.push(`increase max distance (currently ${filters.maxDistance} mi)`);
    if (filters.dealType !== 'all') hints.push('select "All Deals" for more deal types');
    if (filters.foodCategory) hints.push('clear the food category filter');
    if (filters.requiresApp === 'no') hints.push('allow app deals');
    if (filters.requiresApp === 'yes') hints.push('allow non-app deals');
    if (filters.search.trim()) hints.push('clear your search text');

    // 6C: Category-specific message
    const foodCategoryLabel = filters.foodCategory
      ? filters.foodCategory.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : null;

    return (
      <div className="text-center py-16 text-stone-500">
        <p className="font-medium text-stone-800 text-lg">
          {filters.savedOnly
            ? 'No saved deals in this city'
            : foodCategoryLabel
            ? `No ${foodCategoryLabel} deals in ${cityName || 'this city'} yet`
            : 'No deals match your filters'}
        </p>
        {filters.savedOnly ? (
          <p className="text-sm mt-2 text-stone-500">Star deals to save them — then find them here.</p>
        ) : foodCategoryLabel && citySlug ? (
          <div className="mt-4 text-sm text-stone-500 space-y-3">
            <p>This category may not have coverage in {cityName || 'this city'} yet.</p>
            <Link
              href={`/deals/${citySlug}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-medium transition-colors"
            >
              Browse all deals in {cityName} →
            </Link>
          </div>
        ) : hints.length > 0 ? (
          <div className="mt-4 text-sm text-stone-500 max-w-xs mx-auto">
            <p className="mb-2">Try:</p>
            <ul className="text-left space-y-1 inline-block">
              {hints.map((hint, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-stone-300 mt-0.5">→</span>
                  <span>{hint.charAt(0).toUpperCase() + hint.slice(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm mt-1">Try adjusting your filters or search terms.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-400 mb-4">
        Showing <span className="font-medium text-stone-700">{Math.min(visibleCount, filteredCount)}</span>{' '}
        of <span className="font-medium text-stone-700">{filteredCount}</span> deal{filteredCount !== 1 ? 's' : ''}
        <span className="text-stone-300"> · </span>
        <span>{totalLocations.toLocaleString()} locations</span>
        <span className="text-stone-300"> · </span>
        {hasLocation ? 'sorted by distance' : 'sorted by confidence'}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        {visibleGroups.map((group) => (
          <DealGroupCard
            key={group.group_id}
            group={group}
            userLat={userLat}
            userLng={userLng}
            cityName={cityName}
            updatedAt={updatedAt}
          />
        ))}
      </div>
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisibleCount(prev => prev + LOAD_MORE_COUNT)}
            className="px-6 py-2.5 bg-white border border-stone-200 rounded-full text-sm font-medium text-stone-700 hover:border-stone-300 transition-colors"
          >
            Show {Math.min(LOAD_MORE_COUNT, displayed.length - visibleCount)} more
          </button>
        </div>
      )}
    </div>
  );
}
