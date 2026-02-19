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

// 2E: Regional grouping
const REGIONS: Record<string, { emoji: string; cities: string[] }> = {
  'Northeast': {
    emoji: '🗽',
    cities: ['new-york-ny', 'philadelphia-pa', 'boston-ma', 'washington-dc', 'baltimore-md', 'pittsburgh-pa', 'buffalo-ny', 'rochester-ny', 'hartford-ct', 'providence-ri'],
  },
  'Southeast': {
    emoji: '☀️',
    cities: ['miami-fl', 'atlanta-ga', 'charlotte-nc', 'tampa-fl', 'orlando-fl', 'jacksonville-fl', 'nashville-tn', 'raleigh-nc', 'richmond-va', 'virginia-beach-va', 'new-orleans-la', 'memphis-tn', 'louisville-ky', 'baton-rouge-la', 'birmingham-al', 'jackson-ms', 'mobile-al', 'huntsville-al', 'chattanooga-tn', 'knoxville-tn', 'columbia-sc', 'greenville-sc', 'little-rock-ar', 'cape-coral-fl', 'sarasota-fl'],
  },
  'Midwest': {
    emoji: '🌽',
    cities: ['chicago-il', 'detroit-mi', 'minneapolis-mn', 'cleveland-oh', 'columbus-oh', 'cincinnati-oh', 'indianapolis-in', 'kansas-city-mo', 'st-louis-mo', 'milwaukee-wi', 'omaha-ne', 'wichita-ks', 'tulsa-ok', 'oklahoma-city-ok'],
  },
  'South Central': {
    emoji: '🤠',
    cities: ['dallas-tx', 'houston-tx', 'san-antonio-tx', 'austin-tx', 'fort-worth-tx', 'el-paso-tx', 'corpus-christi-tx', 'lubbock-tx', 'mcallen-tx'],
  },
  'Southwest': {
    emoji: '🌵',
    cities: ['phoenix-az', 'albuquerque-nm', 'tucson-az', 'las-vegas-nv', 'colorado-springs-co'],
  },
  'West': {
    emoji: '🌊',
    cities: ['los-angeles-ca', 'san-francisco-ca', 'seattle-wa', 'denver-co', 'portland-or', 'san-jose-ca', 'sacramento-ca', 'fresno-ca', 'salt-lake-city-ut', 'boise-id', 'spokane-wa', 'reno-nv'],
  },
};

function CityCard({ city }: { city: CityCardData }) {
  return (
    <Link
      href={`/deals/${city.slug}`}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
    >
      <div className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors leading-tight flex items-center gap-1">
        {city.name}
        {city.dealCount >= 1000 && <span className="text-xs text-orange-500">🔥</span>}
      </div>
      {city.dealCount > 0 ? (
        <div className={`text-xs mt-1 ${city.dealCount >= 500 ? 'text-green-600' : city.dealCount >= 100 ? 'text-yellow-600' : 'text-gray-400'}`}>
          {city.dealCount.toLocaleString()} deals
        </div>
      ) : (
        <div className="text-xs text-gray-400 mt-1">
          {(city.population / 1000000).toFixed(1)}M metro
        </div>
      )}
    </Link>
  );
}

export default function CityGrid({ cities }: CityGridProps) {
  const [search, setSearch] = useState('');
  const [collapsedRegions, setCollapsedRegions] = useState<Set<string>>(new Set());

  const cityMap = new Map(cities.map((c) => [c.slug, c]));

  const toggleRegion = (region: string) => {
    setCollapsedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  const isSearching = search.trim().length > 0;

  const filtered = isSearching
    ? cities.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.display.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div>
      {/* City search */}
      <div className="mb-6 relative">
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

      {/* Search results (flat grid) */}
      {isSearching && (
        <>
          {filtered!.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No cities found matching &quot;{search}&quot;
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered!.map((city) => (
                <CityCard key={city.slug} city={city} />
              ))}
            </div>
          )}
          {filtered!.length > 0 && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              {filtered!.length} cit{filtered!.length === 1 ? 'y' : 'ies'} found
            </p>
          )}
        </>
      )}

      {/* Regional grouped view (default) */}
      {!isSearching && (
        <div className="space-y-6">
          {Object.entries(REGIONS).map(([regionName, { emoji, cities: regionSlugs }]) => {
            const regionCities = regionSlugs.map((slug) => cityMap.get(slug)).filter(Boolean) as CityCardData[];
            if (regionCities.length === 0) return null;

            const isCollapsed = collapsedRegions.has(regionName);

            return (
              <div key={regionName}>
                <button
                  onClick={() => toggleRegion(regionName)}
                  className="flex items-center gap-2 mb-3 w-full text-left group"
                >
                  <span className="text-lg">{emoji}</span>
                  <h3 className="text-sm font-semibold text-gray-700 group-hover:text-blue-700 transition-colors">
                    {regionName}
                  </h3>
                  <span className="text-xs text-gray-400 ml-1">({regionCities.length} cities)</span>
                  <span className="text-gray-300 text-xs ml-auto">
                    {isCollapsed ? '▶' : '▼'}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {regionCities.map((city) => (
                      <CityCard key={city.slug} city={city} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Any cities not in a region (fallback) */}
          {(() => {
            const allRegionSlugs = new Set(Object.values(REGIONS).flatMap((r) => r.cities));
            const uncategorized = cities.filter((c) => !allRegionSlugs.has(c.slug));
            if (uncategorized.length === 0) return null;
            return (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">🗺️ Other Cities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {uncategorized.map((city) => (
                    <CityCard key={city.slug} city={city} />
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
