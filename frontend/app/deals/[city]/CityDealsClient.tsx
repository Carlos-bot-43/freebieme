'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CityConfig, CityDeals, distanceMiles, groupDeals } from '../../../lib/types';
import FilterBar, { Filters, DEFAULT_FILTERS } from '../../../components/FilterBar';
import DealList from '../../../components/DealList';
import { DealListSkeleton } from '../../../components/DealSkeleton';

function formatCategoryTitle(slug: string): string {
  const labels: Record<string, string> = {
    'burgers': 'Burger',
    'pizza': 'Pizza',
    'chicken': 'Chicken',
    'tacos': 'Taco',
    'breakfast': 'Breakfast',
    'coffee': 'Coffee',
    'ice-cream': 'Ice Cream',
    'sandwiches': 'Sandwich',
    'wings': 'Wing',
  };
  return labels[slug] || slug.charAt(0).toUpperCase() + slug.slice(1);
}

interface NearbyCity extends CityConfig {
  distFromCurrent: number;
}

interface CityDealsClientProps {
  cityConfig: CityConfig;
  allCities: CityConfig[];
  nearbyCities?: NearbyCity[];
  defaultFoodCategory?: string;
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

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('freebieme_location');
      if (cached) {
        const { lat, lng, label } = JSON.parse(cached);
        setUserLat(lat); setUserLng(lng);
        setLocationStatus('found'); setLocationLabel(label || 'saved');
        const { city: nearest } = findNearestCity(lat, lng, allCities);
        if (nearest.slug !== cityConfig.slug) setSuggestedCity(nearest);
      }
    } catch {}
  }, [cityConfig.slug, allCities]);

  const handleRequestGPS = () => {
    if (!navigator.geolocation) { setLocationStatus('error'); return; }
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
  };

  const handleCityChange = (slug: string) => router.push(`/deals/${slug}`);

  const handleLocationSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationSearch.trim()) return;
    setLocationSearching(true);
    setLocationSearchError('');
    setSuggestedCity(null);

    const result = await geocodeQuery(locationSearch.trim());
    if (!result) {
      setLocationSearchError(`Could not find "${locationSearch}". Try a ZIP or a city like "90210" or "Austin TX".`);
      setLocationSearching(false);
      return;
    }

    setUserLat(result.lat); setUserLng(result.lng);
    setLocationStatus('found'); setLocationLabel(locationSearch.trim());
    setLocationSearching(false);
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: result.lat, lng: result.lng, label: locationSearch.trim() })); } catch {}

    const { city: nearest, dist: nearestDist } = findNearestCity(result.lat, result.lng, allCities);
    if (nearestDist > 60) {
      setLocationSearchError(`We don't cover "${locationSearch.trim()}" yet. Closest city: ${nearest.name} (${Math.round(nearestDist)} mi).`);
    } else if (nearest.slug !== cityConfig.slug) {
      setSuggestedCity(nearest);
    }
  };

  const dealStats = useMemo(() => {
    if (!cityDeals) return null;
    const groups = groupDeals(cityDeals.deals, userLat, userLng);
    return { groupCount: groups.length, locationCount: cityDeals.deals.length };
  }, [cityDeals, userLat, userLng]);

  const instantNearby = useMemo(() => {
    if (!cityDeals || !userLat || !userLng) return [];
    const groups = groupDeals(cityDeals.deals, userLat, userLng);
    return groups.filter(g => g.claim_type === 'instant' && (g.nearestDistance ?? 999) <= 5);
  }, [cityDeals, userLat, userLng]);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-[#FAF7F2]/85 backdrop-blur border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-5 py-3">
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/"
              className="text-base font-semibold text-stone-900 tracking-tight hover:text-stone-600 transition-colors whitespace-nowrap"
            >
              FreebieMe
            </Link>
            <div className="flex-1" />
            <select
              value={cityConfig.slug}
              onChange={(e) => handleCityChange(e.target.value)}
              className="text-sm bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-stone-300 max-w-48"
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
              placeholder="ZIP or city — find nearest deals"
              className="flex-1 px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-stone-300 min-w-0 placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={locationSearching}
              className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
            >
              {locationSearching ? '…' : 'Search'}
            </button>
          </form>
        </div>
        {locationSearchError && (
          <div className="max-w-6xl mx-auto px-5 pb-2">
            <p className="text-xs text-orange-600">{locationSearchError}</p>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6">
        <nav className="text-xs text-stone-400 mb-3 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-stone-700 transition-colors">FreebieMe</Link>
          <span className="text-stone-300">›</span>
          <Link href={`/deals/${cityConfig.slug}`} className="hover:text-stone-700 transition-colors">{cityConfig.name}</Link>
          {defaultFoodCategory && (
            <>
              <span className="text-stone-300">›</span>
              <span className="text-stone-700 font-medium capitalize">{defaultFoodCategory}</span>
            </>
          )}
        </nav>

        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight leading-tight">
            {defaultFoodCategory
              ? `${formatCategoryTitle(defaultFoodCategory)} deals in ${cityConfig.display}`
              : `Free food deals in ${cityConfig.display}`}
          </h1>
          <p className="text-stone-500 text-sm mt-2">
            {loadingDeals ? 'Loading deals…' : dealsError ? 'Failed to load deals.' : dealStats ? (
              <>
                <span className="font-medium text-stone-700">{dealStats.groupCount}</span> unique deal{dealStats.groupCount !== 1 ? 's' : ''}
                {' · '}
                <span className="font-medium text-stone-700">{dealStats.locationCount.toLocaleString()}</span> locations
                {locationStatus === 'found' && locationLabel && (
                  <> · sorted from <strong className="text-stone-700">{locationLabel}</strong></>
                )}
              </>
            ) : null}
          </p>
        </div>

        {suggestedCity && (
          <div className="mb-5 bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-stone-700">
              You&rsquo;re closer to <strong className="text-stone-900">{suggestedCity.display}</strong>
            </span>
            <button
              onClick={() => router.push(`/deals/${suggestedCity.slug}`)}
              className="text-xs font-medium text-stone-900 hover:text-stone-600 px-3 py-1.5 transition-colors whitespace-nowrap"
            >
              Switch →
            </button>
          </div>
        )}

        {loadingDeals && (
          <div className="flex gap-6 flex-col lg:flex-row">
            <div className="lg:w-72 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-stone-100 p-5 animate-pulse space-y-3">
                <div className="h-10 bg-stone-100 rounded-lg" />
                <div className="h-4 bg-stone-100 rounded w-24" />
                <div className="flex flex-wrap gap-1.5">
                  {[1,2,3,4].map(i => <div key={i} className="h-6 bg-stone-100 rounded-full w-16" />)}
                </div>
              </div>
            </div>
            <div className="flex-1"><DealListSkeleton /></div>
          </div>
        )}

        {dealsError && (
          <div className="flex items-center justify-center py-24 text-stone-400">
            <div className="text-center">
              <div className="text-sm font-medium text-stone-700 mb-1">Couldn&rsquo;t load deals</div>
              <div className="text-xs">Try refreshing the page.</div>
            </div>
          </div>
        )}

        {!loadingDeals && !dealsError && cityDeals && (
          <div className="flex gap-6 flex-col lg:flex-row">
            <aside className="lg:w-72 flex-shrink-0">
              {(() => {
                const activeCnt = [
                  filters.dealType !== 'all',
                  filters.requiresApp !== 'any',
                  filters.maxDistance !== null,
                  filters.nearMe,
                  filters.savedOnly,
                  filters.search.trim() !== '',
                  filters.foodCategory !== '' && filters.foodCategory !== defaultFoodCategory,
                  filters.claimType !== '',
                  filters.noApp,
                ].filter(Boolean).length;
                return (
                  <button
                    className="lg:hidden w-full mb-3 py-2.5 px-4 bg-white border border-stone-200 rounded-xl text-sm font-medium text-stone-700 flex items-center justify-between"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <span>Filters {activeCnt > 0 ? `(${activeCnt})` : ''}</span>
                    <span className="text-stone-400">{showFilters ? '▴' : '▾'}</span>
                  </button>
                );
              })()}
              <div className={`sticky top-24 ${!showFilters ? 'hidden lg:block' : ''}`}>
                <FilterBar
                  filters={filters}
                  onFiltersChange={setFilters}
                  hasLocation={locationStatus === 'found'}
                  defaultFoodCategory={defaultFoodCategory}
                />
                {locationStatus === 'idle' && (
                  <button
                    onClick={handleRequestGPS}
                    className="mt-3 w-full text-xs font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-xl py-2.5 px-3 bg-white transition-colors"
                  >
                    Use my location
                  </button>
                )}
                {locationStatus === 'detecting' && (
                  <div className="mt-3 text-xs text-center text-stone-400 py-2">
                    Getting your location…
                  </div>
                )}
                {locationStatus === 'found' && (
                  <div className="mt-3 text-[11px] text-center text-stone-500 py-1">
                    Sorted from <span className="font-medium text-stone-700">{locationLabel}</span>
                  </div>
                )}

                <div className="mt-5 bg-white rounded-2xl border border-stone-100 p-5">
                  <h3 className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.16em] mb-3">
                    Browse by type
                  </h3>
                  <div className="space-y-0.5">
                    {[
                      { type: 'birthday',        label: 'Birthday' },
                      { type: 'signup_bonus',    label: 'Sign-up bonus' },
                      { type: 'app_deal',        label: 'App deals' },
                      { type: 'freebie',         label: 'Freebies' },
                      { type: 'rewards_program', label: 'Rewards' },
                      { type: 'happy_hour',      label: 'Happy hour' },
                      { type: 'bogo',            label: 'BOGO' },
                      { type: 'discount',        label: 'Discounts' },
                    ].map(({ type, label }) => {
                      const count = cityDeals.deals.filter((d) => d.deal_type === type).length;
                      if (count === 0) return null;
                      const active = filters.dealType === type;
                      return (
                        <button
                          key={type}
                          onClick={() => setFilters({ ...filters, dealType: active ? 'all' : type })}
                          className={`w-full flex items-center justify-between py-1.5 text-sm transition-colors ${
                            active ? 'text-stone-900 font-medium' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <span>{label}</span>
                          <span className={active ? 'text-stone-700' : 'text-stone-400'}>{count.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {nearbyCities.length > 0 && (
                  <div className="mt-4 bg-white rounded-2xl border border-stone-100 p-5">
                    <h3 className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.16em] mb-3">
                      Nearby cities
                    </h3>
                    <div className="space-y-0.5">
                      {nearbyCities.map((nearby) => (
                        <button
                          key={nearby.slug}
                          onClick={() => router.push(`/deals/${nearby.slug}`)}
                          className="w-full flex items-center justify-between py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
                        >
                          <span>{nearby.name}</span>
                          <span className="text-stone-400 text-xs">{Math.round(nearby.distFromCurrent)} mi</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </aside>

            <div className="flex-1 min-w-0">
              {instantNearby.length > 0 && filters.claimType !== 'instant' && (
                <button
                  onClick={() => setFilters(f => ({ ...f, claimType: 'instant' }))}
                  className="w-full mb-4 bg-white border border-stone-200 hover:border-stone-300 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 transition-colors text-left"
                >
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-stone-900">
                      {instantNearby.length} deal{instantNearby.length !== 1 ? 's' : ''} you can use right now
                    </span>
                    <p className="text-xs text-stone-500 truncate">
                      {instantNearby.map(g => g.location_name).slice(0, 3).join(' · ')}
                      {instantNearby.length > 3 ? ` +${instantNearby.length - 3}` : ''} within 5 mi
                    </p>
                  </div>
                  <span className="text-xs font-medium text-stone-500 whitespace-nowrap">Show →</span>
                </button>
              )}
              <DealList
                deals={cityDeals.deals}
                filters={filters}
                userLat={userLat}
                userLng={userLng}
                updatedAt={cityDeals.updated_at}
                cityName={cityConfig.name}
                citySlug={cityConfig.slug}
              />
            </div>
          </div>
        )}

        <footer className="mt-16 pt-6 border-t border-stone-100 text-center">
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-stone-400 mb-3">
            <Link href="/" className="hover:text-stone-700 transition-colors">FreebieMe</Link>
            <span className="text-stone-300">·</span>
            <Link href={`/deals/${cityConfig.slug}`} className="hover:text-stone-700 transition-colors">
              All deals in {cityConfig.name}
            </Link>
            <span className="text-stone-300">·</span>
            <Link href="/chains" className="hover:text-stone-700 transition-colors">All chains</Link>
          </div>
          <p className="text-[11px] text-stone-300">
            Always verify at the restaurant. FreebieMe is not affiliated with any chain.
          </p>
        </footer>
      </div>
    </div>
  );
}
