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
  foodCategory: string;
  claimType: '' | 'instant' | 'same_day_setup' | 'birthday_only';
  noApp: boolean;
}

interface FilterBarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  hasLocation: boolean;
  defaultFoodCategory?: string;
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
  claimType: '',
  noApp: false,
};

function isFiltered(filters: Filters, defaultFoodCategory = ''): boolean {
  return filters.dealType !== 'all' ||
    filters.requiresApp !== 'any' ||
    filters.maxDistance !== null ||
    filters.nearMe ||
    filters.savedOnly ||
    filters.search.trim() !== '' ||
    (filters.foodCategory !== '' && filters.foodCategory !== defaultFoodCategory) ||
    filters.claimType !== '' ||
    filters.noApp;
}

function countActiveFilters(filters: Filters, defaultFoodCategory = ''): number {
  let count = 0;
  if (filters.dealType !== 'all') count++;
  if (filters.requiresApp !== 'any') count++;
  if (filters.maxDistance !== null) count++;
  if (filters.nearMe) count++;
  if (filters.savedOnly) count++;
  if (filters.search.trim() !== '') count++;
  if (filters.foodCategory !== '' && filters.foodCategory !== defaultFoodCategory) count++;
  if (filters.claimType !== '') count++;
  if (filters.noApp) count++;
  return count;
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
        active
          ? 'bg-stone-900 text-white'
          : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-100'
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.16em] mb-2 block">
      {children}
    </label>
  );
}

export default function FilterBar({ filters, onFiltersChange, hasLocation, defaultFoodCategory = '' }: FilterBarProps) {
  const update = (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch });

  const filtered = isFiltered(filters, defaultFoodCategory);
  const activeFilterCount = countActiveFilters(filters, defaultFoodCategory);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-5">
      {filtered && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-stone-700 uppercase tracking-[0.16em]">
            {activeFilterCount > 0 ? `${activeFilterCount} active` : 'Filters active'}
          </span>
          <button
            onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, foodCategory: defaultFoodCategory })}
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
          >
            Reset all
          </button>
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="Search burgers, pizza, coffee, chains…"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full px-3 py-2.5 text-sm bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder:text-stone-400"
        />
      </div>

      <div>
        <SectionLabel>Get it when</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: '', label: 'Any time' },
            { value: 'instant', label: 'Right now' },
            { value: 'same_day_setup', label: 'Today' },
            { value: 'birthday_only', label: 'Birthday' },
          ].map(({ value, label }) => (
            <Pill
              key={value}
              active={filters.claimType === value}
              onClick={() => update({ claimType: value as Filters['claimType'] })}
            >
              {label}
            </Pill>
          ))}
          <Pill active={filters.noApp} onClick={() => update({ noApp: !filters.noApp })}>
            No app
          </Pill>
        </div>
      </div>

      <div>
        <SectionLabel>Food</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <Pill
            active={filters.foodCategory === '' || filters.foodCategory === defaultFoodCategory}
            onClick={() => update({ foodCategory: defaultFoodCategory })}
          >
            All
          </Pill>
          {TOP_FOOD_CATEGORIES.map((cat) => (
            <Pill
              key={cat}
              active={filters.foodCategory === cat}
              onClick={() => update({ foodCategory: filters.foodCategory === cat ? defaultFoodCategory : cat })}
            >
              {FOOD_CATEGORY_LABELS[cat] || cat}
            </Pill>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        {hasLocation && (
          <button
            onClick={() => update({ nearMe: !filters.nearMe, maxDistance: null })}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
              filters.nearMe
                ? 'bg-stone-900 text-white'
                : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-300'
            }`}
          >
            Near me
          </button>
        )}
        <button
          onClick={() => update({ savedOnly: !filters.savedOnly })}
          className={`${hasLocation ? 'flex-1' : 'w-full'} py-2 rounded-xl text-xs font-medium transition-colors ${
            filters.savedOnly
              ? 'bg-stone-900 text-white'
              : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-300'
          }`}
        >
          ★ Saved
        </button>
      </div>

      <div>
        <SectionLabel>Deal type</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {DEAL_TYPES.map((type) => (
            <Pill
              key={type}
              active={filters.dealType === type}
              onClick={() => update({ dealType: type })}
            >
              {type === 'all' ? 'All' : DEAL_TYPE_LABELS[type]}
            </Pill>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>App required</SectionLabel>
        <div className="flex gap-1.5">
          {(['any', 'no', 'yes'] as const).map((val) => (
            <Pill
              key={val}
              active={filters.requiresApp === val}
              onClick={() => update({ requiresApp: val })}
            >
              {val === 'any' ? 'Any' : val === 'yes' ? 'Yes' : 'No app'}
            </Pill>
          ))}
        </div>
      </div>

      {hasLocation && !filters.nearMe && (
        <div>
          <SectionLabel>Max distance</SectionLabel>
          <div className="flex gap-1.5 flex-wrap">
            {[null, 1, 3, 5, 10, 25].map((dist) => (
              <Pill
                key={dist ?? 'any'}
                active={filters.maxDistance === dist}
                onClick={() => update({ maxDistance: dist })}
              >
                {dist === null ? 'Any' : `${dist} mi`}
              </Pill>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
