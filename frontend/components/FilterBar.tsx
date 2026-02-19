'use client';

import { DEAL_TYPE_LABELS } from '../lib/types';
import { FOOD_CATEGORY_LABELS, TOP_FOOD_CATEGORIES } from '../lib/foodCategories';

export interface Filters {
  dealType: string;
  requiresApp: 'any' | 'yes' | 'no';
  maxDistance: number | null;
  nearMe: boolean;
  search: string;
  savedOnly: boolean;
  foodCategory: string; // '' = all
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  hasLocation: boolean;
  defaultFoodCategory?: string; // 2D: category pages pass this to avoid false "Filters active"
}

const DEAL_TYPES = ['all', ...Object.keys(DEAL_TYPE_LABELS)];

export const DEFAULT_FILTERS: Filters = {
  dealType: 'all',
  requiresApp: 'any',
  maxDistance: null,
  nearMe: false,
  search: '',
  savedOnly: false,
  foodCategory: '',
};

// 2D: Exclude defaultFoodCategory from "active" check
function isFiltered(filters: Filters, defaultFoodCategory = ''): boolean {
  return filters.dealType !== 'all' ||
    filters.requiresApp !== 'any' ||
    filters.maxDistance !== null ||
    filters.nearMe ||
    filters.savedOnly ||
    filters.search.trim() !== '' ||
    (filters.foodCategory !== '' && filters.foodCategory !== defaultFoodCategory);
}

// 6A: Count active filters for mobile badge
function countActiveFilters(filters: Filters, defaultFoodCategory = ''): number {
  let count = 0;
  if (filters.dealType !== 'all') count++;
  if (filters.requiresApp !== 'any') count++;
  if (filters.maxDistance !== null) count++;
  if (filters.nearMe) count++;
  if (filters.savedOnly) count++;
  if (filters.search.trim() !== '') count++;
  if (filters.foodCategory !== '' && filters.foodCategory !== defaultFoodCategory) count++;
  return count;
}

export default function FilterBar({ filters, onFiltersChange, hasLocation, defaultFoodCategory = '' }: FilterBarProps) {
  const update = (patch: Partial<Filters>) =>
    onFiltersChange({ ...filters, ...patch });

  const filtered = isFiltered(filters, defaultFoodCategory);
  const activeFilterCount = countActiveFilters(filters, defaultFoodCategory);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      {/* Header with reset */}
      {filtered && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-blue-600">
            Filters active {activeFilterCount > 0 && `(${activeFilterCount})`}
          </span>
          <button
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, foodCategory: defaultFoodCategory })}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Reset all
          </button>
        </div>
      )}

      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search burgers, pizza, coffee, chains..."
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Food Category Quick Filters */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
          Food Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => update({ foodCategory: defaultFoodCategory })}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filters.foodCategory === '' || filters.foodCategory === defaultFoodCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🍽️ All
          </button>
          {TOP_FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => update({ foodCategory: filters.foodCategory === cat ? defaultFoodCategory : cat })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.foodCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {FOOD_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Quick filter buttons row */}
      <div className="flex gap-2">
        {/* Near Me quick filter */}
        {hasLocation && (
          <button
            onClick={() => update({ nearMe: !filters.nearMe, maxDistance: null })}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              filters.nearMe
                ? 'bg-green-600 text-white'
                : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            }`}
          >
            📍 Near Me
          </button>
        )}
        {/* Saved deals filter */}
        <button
          onClick={() => update({ savedOnly: !filters.savedOnly })}
          className={`${hasLocation ? 'flex-1' : 'w-full'} py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
            filters.savedOnly
              ? 'bg-yellow-500 text-white'
              : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
          }`}
        >
          ★ Saved
        </button>
      </div>

      {/* Deal type filter */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
          Deal Type
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => update({ dealType: type })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.dealType === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? '🍽️ All Deals' : DEAL_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* App requirement toggle */}
      <div className="flex items-center gap-4">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          App Required
        </label>
        <div className="flex gap-1.5">
          {(['any', 'no', 'yes'] as const).map((val) => (
            <button
              key={val}
              onClick={() => update({ requiresApp: val })}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filters.requiresApp === val
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {val === 'any' ? 'Any' : val === 'yes' ? 'Yes' : 'No App'}
            </button>
          ))}
        </div>
      </div>

      {/* Distance filter (only if user location available, not when nearMe is active) */}
      {hasLocation && !filters.nearMe && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
            Max Distance
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {[null, 1, 3, 5, 10, 25].map((dist) => (
              <button
                key={dist ?? 'any'}
                onClick={() => update({ maxDistance: dist })}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filters.maxDistance === dist
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {dist === null ? 'Any' : `${dist} mi`}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
