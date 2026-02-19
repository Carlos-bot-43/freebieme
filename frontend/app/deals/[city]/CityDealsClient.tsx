'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CityConfig, CityDeals, distanceMiles, groupDeals } from '../../../lib/types';
import FilterBar, { Filters, DEFAULT_FILTERS } from '../../../components/FilterBar';
import DealList from '../../../components/DealList';
import { DealListSkeleton } from '../../../components/DealSkeleton';

interface NearbyCity extends CityConfig {
  distFromCurrent: number;
}

interface CityDealsClientProps {
  cityConfig: CityConfig;
  allCities: CityConfig[];
  nearbyCities?: NearbyCity[];
  defaultFoodCategory?: string; // for SEO category pages
}

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number; display: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
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
    if (dist < minDist) { minDist = dist; nearest = city; }
  }
  return { city: nearest, dist: minDist };
}

export default function CityDealsClient({
  cityConfig,
  allCities,
  nearbyCities = [],
  defaultFoodCategory = '',
}: CityDealsClientProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({
    ...DEFAULT_FILTERS,
    foodCategory: defaultFoodCategory,
  });
  const [userLat, setUserLat] = useState<number | undefined>();
  const [userLng, setUserLng] = useState<number | undefined>();
  const [locationStatus, setLocationStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [locationLabel, setLocationLabel] = useState<string>('');
  const [suggestedCity, setSuggestedCity] = useState<CityConfig | null>(null);

  const [locationSearch, setLocationSearch] = useState('');
  const [locationSearching, setLocationSearching] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState('');

  const [showFilters, setShowFilters] = useState(false);

  const [cityDeals, setCityDeals] = useState<CityDeals | null>(null);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [dealsError, setDealsError] = useState(false);

  // Fetch deal data from public static file
  useEffect(() => {
    let cancelled = false;
    setLoadingDeals(true);
    setDealsError(false);

    const fetchWithRetry = async (retries = 2): Promise<void> => {
      try {
        const res = await fetch(`/data/deals/${cityConfig.slug}.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CityDeals = await res.json();
        if (!cancelled) { setCityDeals(data); setLoadingDeals(false); }
      } catch {
        if (retries > 0 && !cancelled) {
          await new Promise(r => setTimeout(r, 1000));
          return fetchWithRetry(retries - 1);
        }
        if (!cancelled) { setDealsError(true); setLoadingDeals(false); }
      }
    };

    fetchWithRetry();
    return () => { cancelled = true; };
  }, [cityConfig.slug]);

  // Restore location from sessionStorage or auto-detect GPS
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('freebieme_location');
      if (cached) {
        const { lat, lng, label } = JSON.parse(cached);
        setUserLat(lat); setUserLng(lng);
        setLocationStatus('found'); setLocationLabel(label || 'saved');
        const { city: nearest } = findNearestCity(lat, lng, allCities);
        if (nearest.slug !== cityConfig.slug) setSuggestedCity(nearest);
        return;
      }
    } catch {}

    if (navigator.geolocation) {
      setLocationStatus('detecting');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLat(lat); setUserLng(lng);
          setLocationStatus('found'); setLocationLabel('GPS');
          try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat, lng, label: 'GPS' })); } catch {}
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

  const handleCityChange = (slug: string) => router.push(`/deals/${slug}`);

  const handleLocationSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;
    setLocationSearching(true);
    setLocationSearchError('');
    setSuggestedCity(null);

    const result = await geocodeQuery(locationSearch.trim());
    if (!result) {
      setLocationSearchError(`Could not find "${locationSearch}". Try a ZIP code or city name like "90210" or "Austin TX".`);
      setLocationSearching(false);
      return;
    }

    setUserLat(result.lat); setUserLng(result.lng);
    setLocationStatus('found'); setLocationLabel(locationSearch.trim());
    setLocationSearching(false);
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: result.lat, lng: result.lng, label: locationSearch.trim() })); } catch {}

    const { city: nearest, dist: nearestDist } = findNearestCity(result.lat, result.lng, allCities);
    if (nearestDist > 60) {
      setLocationSearchError(`We don't cover "${locationSearch.trim()}" yet. The closest city we have is ${nearest.name} (${Math.round(nearestDist)} mi away). Browse their deals below or check back as we expand!`);
    } else if (nearest.slug !== cityConfig.slug) {
      setSuggestedCity(nearest);
    }
  };

  // Compute grouped deal stats for the header
  const dealStats = useMemo(() => {
    if (!cityDeals) return null;
    const groups = groupDeals(cityDeals.deals, userLat, userLng);
    return { groupCount: groups.length, locationCount: cityDeals.deals.length };
  }, [cityDeals, userLat, userLng]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2">
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
                <option key={city.slug} value={city.slug}>{city.name}</option>
              ))}
            </select>
          </div>
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
        {/* Breadcrumb */}
        <nav className="text-xs text-gray-400 mb-3 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-blue-600 transition-colors">FreebieMe</Link>
          <span>›</span>
          <Link href="/" className="hover:text-blue-600 transition-colors">Cities</Link>
          <span>›</span>
          <Link href={`/deals/${cityConfig.slug}`} className="hover:text-blue-600 transition-colors">{cityConfig.name}</Link>
          {defaultFoodCategory && (
            <>
              <span>›</span>
              <span className="text-gray-600 font-medium capitalize">{defaultFoodCategory}</span>
            </>
          )}
        </nav>

        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {defaultFoodCategory
              ? `${defaultFoodCategory.charAt(0).toUpperCase() + defaultFoodCategory.slice(1)} Deals in ${cityConfig.display}`
              : `Free Food Deals in ${cityConfig.display}`}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {loadingDeals ? 'Loading deals...' : dealsError ? 'Failed to load deals.' : dealStats ? (
              <>
                <span className="font-medium text-gray-700">{dealStats.groupCount}</span> unique deal{dealStats.groupCount !== 1 ? 's' : ''}{' '}
                at <span className="font-medium text-gray-700">{dealStats.locationCount.toLocaleString()}</span> restaurant locations •{' '}
                Updated {cityDeals && new Date(cityDeals.updated_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
                {locationStatus === 'found' && locationLabel && (
                  <> • Nearest to <strong>{locationLabel}</strong></>
                )}
              </>
            ) : null}
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
                {/* Deal breakdown */}
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
                    { type: 'happy_hour',      label: '🕐 Happy Hour' },
                    { type: 'bogo',            label: '2️⃣ BOGO' },
                    { type: 'discount',        label: '💰 Discounts' },
                  ].map(({ type, label }) => {
                    const count = cityDeals.deals.filter((d) => d.deal_type === type).length;
                    if (count === 0) return null;
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
                        <span className="text-gray-400 text-xs">{Math.round(nearby.distFromCurrent)} mi</span>
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
                updatedAt={cityDeals.updated_at}
                cityName={cityConfig.name}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-gray-200 text-center">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-400 mb-3">
            <Link href="/" className="hover:text-blue-600 transition-colors">🍔 FreebieMe Home</Link>
            <span>•</span>
            <Link href={`/deals/${cityConfig.slug}`} className="hover:text-blue-600 transition-colors">
              All deals in {cityConfig.name}
            </Link>
            <span>•</span>
            <span>Free restaurant deals &amp; freebies across {allCities.length} US cities</span>
          </div>
          <p className="text-xs text-gray-300">
            Deals subject to change · Always verify at the restaurant · FreebieMe is not affiliated with any restaurant chain
          </p>
        </footer>
      </div>
    </div>
  );
}
