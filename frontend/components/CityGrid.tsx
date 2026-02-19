'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CityConfig } from '../lib/types';

interface CityCardData extends CityConfig {
  dealCount: number;
}

interface CityGridProps {
  cities: CityCardData[];
}

export default function CityGrid({ cities }: CityGridProps) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? cities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.display.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase())
      )
    : cities;

  return (
    <div>
      {/* City search */}
      <div className="mb-4 relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search cities..."
          className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg"
          >
            ×
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No cities found matching &quot;{search}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((city) => (
            <Link
              key={city.slug}
              href={`/deals/${city.slug}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
            >
              <div className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-tight">
                {city.name}
              </div>
              {city.dealCount > 0 ? (
                <div className="text-xs text-gray-500 mt-1">
                  {city.dealCount.toLocaleString()} deals
                </div>
              ) : (
                <div className="text-xs text-gray-400 mt-1">
                  {(city.population / 1000000).toFixed(1)}M metro
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {search && filtered.length > 0 && (
        <p className="text-xs text-gray-400 mt-3 text-center">
          {filtered.length} cit{filtered.length === 1 ? 'y' : 'ies'} found
        </p>
      )}
    </div>
  );
}
