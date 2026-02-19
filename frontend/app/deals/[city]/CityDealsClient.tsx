'use client';

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CityConfig, CityDeals, distanceMiles } from '../../../lib/types';
import FilterBar, { Filters } from '../../../components/FilterBar';
import DealList from '../../../components/DealList';
import { DealListSkeleton } from '../../../components/DealSkeleton';

interface NearbyCity extends CityConfig {
  distFromCurrent: number;
}

interface CityDealsClientProps {
  cityConfig: CityConfig;
  allCities: CityConfig[];
  nearbyCities?: NearbyCity[];
}

const DEFAULT_FILTERS: Filters = {
  dealType: 'all',
  requiresApp: 'any',
  maxDistance: null,
  nearMe: false,
  search: '',
  savedOnly: false,
};

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    const data = await res.json();
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display: data[0].display_name.split(',').slice(0, 2).join(', '),
    };
  } catch {
    return null;
  }
}

function findNearestCity(lat: number, lng: number, cities: CityConfig[]): { city: CityConfig; dist: number } {
  let nearest = cities[0];
  let minDist = Infinity;
  for (const city of cities) {
    const dist = distanceMiles(lat, lng, city.center.lat, city.center.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return { city: nearest, dist: minDist };
}

export default function CityDealsClient({ cityConfig, allCities, nearbyCities = [] }: CityDealsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [suggestedCity, setSuggestedCity] = useState<CityConfig | null>(null);

  // Location search state
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');

  // Mobile filter toggle
  const [showFilters, setShowFilters] = useState(false);

  // Deal data fetched client-side from public/data/deals/ (CDN, no serverless needed)
  const [cityDeals, setCityDeals] = useState<CityDeals | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [dealsError, setDealsError] = useState(false);

  // Fetch deal data from public static file (with retry)
  useEffect(() => {
    let cancelled = false;
    setLoadingDeals(true);
    setDealsError(false);

    const fetchWithRetry = async (retries = 2): Promise<void> => {
      try {
        const res = await fetch(`/data/deals/${cityConfig.slug}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CityDeals = await res.json();
        if (!cancelled) {
          setCityDeals(data);
          setLoadingDeals(false);
        }
      } catch (err) {
        if (retries > 0 && !cancelled) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchWithRetry(retries - 1);
        }
        if (!cancelled) {
          setDealsError(true);
          setLoadingDeals(false);
        }
      }
    };

    fetchWithRetry();
    return () => { cancelled = true; };
  }, [cityConfig.slug]);

  // Try to restore location from sessionStorage first, then auto-detect
  useEffect(() => {
    // Check session storage for previous location
    try {
      const cached = sessionStorage.getItem('freebieme_location');
      if (cached) {
        const { lat, lng, label } = JSON.parse(cached);
        setUserLat(lat);
        setUserLng(lng);
        setLocationStatus('found');
        setLocationLabel(label || 'saved');
        const { city: nearest } = findNearestCity(lat, lng, allCities);
        if (nearest.slug !== cityConfig.slug) setSuggestedCity(nearest);
        return;
      }
    } catch {}

    // No cached location — try GPS
    if (navigator.geolocation) {
      setLocationStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat);
          setUserLng(lng);
          setLocationStatus('found');
          setLocationLabel('GPS');
          // Cache in sessionStorage
          try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat, lng, label: 'GPS' })); } catch {}
          // Check if user is closer to a different city
          const { city: nearest } = findNearestCity(lat, lng, allCities);
          if (nearest.slug !== cityConfig.slug) setSuggestedCity(nearest);
        },
        () => setLocationStatus('error'),
        { timeout: 8000, maximumAge: 300000 }
      );
    } else {
      setLocationStatus('error');
    }
  }, [cityConfig.slug, allCities]);

  const handleCityChange = (slug: string) => {
    router.push(`/deals/${slug}`);
  };

  const handleLocationSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;

    setLocationSearching(true);
    setLocationSearchError('');
    setSuggestedCity(null);

    const result = await geocodeQuery(locationSearch.trim());
    if (!result) {
      setLocationSearchError(`Could not find "${locationSearch}". Try a different query.`);
      setLocationSearching(false);
      return;
    }

    setUserLat(result.lat);
    setUserLng(result.lng);
    setLocationStatus('found');
    setLocationLabel(locationSearch.trim());
    setLocationSearching(false);
    // Cache in sessionStorage for navigation between city pages
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: result.lat, lng: result.lng, label: locationSearch.trim() })); } catch {}

    // Check if closer to different city
    const { city: nearest } = findNearestCity(result.lat, result.lng, allCities);
    if (nearest.slug !== cityConfig.slug) {
      setSuggestedCity(nearest);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2">
          {/* Row 1: Logo + City selector */}
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-700 transition-colors whitespace-nowrap">
              🍔 FreebieMe
            </Link>
            <div className="flex-1" />
            <select
              value={cityConfig.slug}
              onChange={(e) => handleCityChange(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-48"
            >
              {[...allCities].sort((a, b) => a.name.localeCompare(b.name)).map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </div>
          {/* Row 2: Location search */}
          <form onSubmit={handleLocationSearch} className="flex gap-2">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search by ZIP or city to find nearest deals..."
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
            />
            <button
              type="submit"
              disabled={locationSearching}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              {locationSearching ? '...' : '📍'}
            </button>
          </form>
        </div>
        {locationSearchError && (
          <div className="max-w-6xl mx-auto px-4 pb-2">
            <p className="text-xs text-red-500">{locationSearchError}</p>
          </div>
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Free Food Deals in {cityConfig.display}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {loadingDeals ? 'Loading deals...' : dealsError ? 'Failed to load deals.' : (
              <>
                {cityDeals?.deal_count.toLocaleString()} deals found •{' '}
                Updated {cityDeals && new Date(cityDeals.updated_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
                {locationStatus === 'found' && locationLabel && (
                  <> • Showing deals nearest to <strong>{locationLabel}</strong></>
                )}
              </>
            )}
          </p>
        </div>

        {/* Suggested city banner */}
        {suggestedCity && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-blue-800">
              💡 Your location is closer to <strong>{suggestedCity.display}</strong>
            </span>
            <button
              onClick={() => router.push(`/deals/${suggestedCity.slug}`)}
              className="text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Switch to {suggestedCity.name} →
            </button>
          </div>
        )}

        {/* Loading state */}
        {loadingDeals && (
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse space-y-3">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-4 bg-gray-100 rounded w-24" />
                <div className="flex flex-wrap gap-1.5">
                  {[1,2,3,4].map(i => <div key={i} className="h-6 bg-gray-100 rounded-full w-16" />)}
                </div>
              </div>
            </div>
            <div className="flex-1"><DealListSkeleton /></div>
          </div>
        )}

        {/* Error state */}
        {dealsError && (
          <div className="flex items-center justify-center py-24 text-gray-400">
            <div className="text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <div className="text-sm">Failed to load deals. Try refreshing.</div>
            </div>
          </div>
        )}

        {/* Deals content */}
        {!loadingDeals && !dealsError && cityDeals && (
          <div className="flex gap-6 flex-col lg:flex-row">
            {/* Sidebar filters */}
            <div className="lg:w-72 flex-shrink-0">
              {/* Mobile filter toggle */}
              <button
                className="lg:hidden w-full mb-3 py-2 px-4 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 flex items-center justify-between shadow-sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <span>🔍 Filters & Sort</span>
                <span className="text-gray-400">{showFilters ? '▲' : '▼'}</span>
              </button>
              <div className={`sticky top-20 ${!showFilters ? 'hidden lg:block' : ''}`}>
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
                    { type: 'birthday',        label: '🎂 Birthday' },
                    { type: 'signup_bonus',    label: '🎁 Sign Up' },
                    { type: 'app_deal',        label: '📱 App Deals' },
                    { type: 'freebie',         label: '🆓 Freebies' },
                    { type: 'rewards_program', label: '⭐ Rewards' },
                    { type: 'bogo',            label: '2️⃣ BOGO' },
                    { type: 'happy_hour',      label: '🕐 Happy Hour' },
                    { type: 'discount',        label: '💰 Discounts' },
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
              {/* Nearby cities */}
              {nearbyCities.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Nearby Cities
                  </h3>
                  {nearbyCities.map((nearby) => (
                    <button
                      key={nearby.slug}
                      onClick={() => router.push(`/deals/${nearby.slug}`)}
                      className="w-full flex items-center justify-between py-1.5 text-sm hover:text-blue-600 transition-colors"
                    >
                      <span className="text-gray-700">{nearby.name}</span>
                      <span className="text-gray-400 text-xs">
                        {Math.round(nearby.distFromCurrent)} mi
                      </span>
                    </button>
                  ))}
                </div>
              )}
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
        )}
      </div>
    </div>
  );
}
