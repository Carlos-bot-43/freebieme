'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CityConfig, CityDeals } from '../../../lib/types';
import FilterBar, { Filters } from '../../../components/FilterBar';
import DealList from '../../../components/DealList';

interface CityDealsClientProps {
  cityConfig: CityConfig;
  cityDeals: CityDeals;
  allCities: CityConfig[];
}

const DEFAULT_FILTERS: Filters = {
  dealType: 'all',
  requiresApp: 'any',
  maxDistance: null,
  search: '',
};

export default function CityDealsClient({ cityConfig, cityDeals, allCities }: CityDealsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');

  // Try to auto-detect location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      setLocationStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLat(pos.coords.latitude);
          setUserLng(pos.coords.longitude);
          setLocationStatus('found');
        },
        () => setLocationStatus('error'),
        { timeout: 8000, maximumAge: 300000 }
      );
    } else {
      setLocationStatus('error');
    }
  }, []);

  const handleCityChange = (slug: string) => {
    router.push(`/deals/${slug}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link href="/" className="text-2xl font-bold text-gray-900 hover:text-blue-700 transition-colors">
            🍔 FreebieMe
          </Link>

          <div className="flex-1" />

          {/* City selector */}
          <select
            value={cityConfig.slug}
            onChange={(e) => handleCityChange(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {allCities.sort((a, b) => a.name.localeCompare(b.name)).map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.name}
              </option>
            ))}
          </select>

          {/* Location indicator */}
          {locationStatus === 'found' && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              📍 Location active
            </span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Free Food Deals in {cityConfig.display}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {cityDeals.deal_count.toLocaleString()} deals found •{' '}
            Updated {new Date(cityDeals.updated_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {locationStatus === 'found' && userLat && userLng && (
              <> • Sorted by distance from you</>
            )}
          </p>
        </div>

        <div className="flex gap-6 flex-col lg:flex-row">
          {/* Sidebar filters */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="sticky top-20">
              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                hasLocation={locationStatus === 'found'}
              />

              {/* Quick stats */}
              <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                  Deal Breakdown
                </h3>
                {[
                  { type: 'birthday', label: '🎂 Birthday' },
                  { type: 'signup_bonus', label: '🎁 Sign Up' },
                  { type: 'app_deal', label: '📱 App Deals' },
                  { type: 'freebie', label: '🆓 Freebies' },
                  { type: 'rewards_program', label: '⭐ Rewards' },
                ].map(({ type, label }) => {
                  const count = cityDeals.deals.filter((d) => d.deal_type === type).length;
                  return (
                    <button
                      key={type}
                      onClick={() => setFilters({ ...filters, dealType: type })}
                      className="w-full flex items-center justify-between py-1.5 text-sm hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-700">{label}</span>
                      <span className="text-gray-400 font-medium">{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Deal list */}
          <div className="flex-1 min-w-0">
            <DealList
              deals={cityDeals.deals}
              filters={filters}
              userLat={userLat}
              userLng={userLng}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
