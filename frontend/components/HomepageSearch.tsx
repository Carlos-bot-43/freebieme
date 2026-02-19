'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { CityConfig, distanceMiles } from '../lib/types';
import { TOP_FOOD_CATEGORIES, FOOD_CATEGORY_LABELS, FOOD_CATEGORY_ALIASES } from '../lib/foodCategories';

interface HomepageSearchProps {
  cities: CityConfig[];
}

async function geocodeQuery(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=us&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function findNearestCity(lat: number, lng: number, cities: CityConfig[]): CityConfig {
  let nearest = cities[0];
  let minDist = Infinity;
  for (const city of cities) {
    const dist = distanceMiles(lat, lng, city.center.lat, city.center.lng);
    if (dist < minDist) { minDist = dist; nearest = city; }
  }
  return nearest;
}

function matchFoodCategory(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (FOOD_CATEGORY_ALIASES[q]) return FOOD_CATEGORY_ALIASES[q];
  // Partial match
  for (const [alias, cat] of Object.entries(FOOD_CATEGORY_ALIASES)) {
    if (q.includes(alias) || alias.includes(q)) return cat;
  }
  return null;
}

function matchCity(query: string, cities: CityConfig[]): CityConfig | null {
  const q = query.trim().toLowerCase();
  for (const city of cities) {
    if (
      city.slug.includes(q) ||
      city.name.toLowerCase().includes(q) ||
      city.display.toLowerCase().includes(q)
    ) {
      return city;
    }
  }
  return null;
}

export default function HomepageSearch({ cities }: HomepageSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [savedLocation, setSavedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [nearestCity, setNearestCity] = useState<CityConfig | null>(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('freebieme_location');
      if (cached) {
        const loc = JSON.parse(cached);
        setSavedLocation(loc);
        const city = findNearestCity(loc.lat, loc.lng, cities);
        setNearestCity(city);
      }
    } catch {}
  }, [cities]);

  const navigateToCategory = (category: string, citySlug?: string) => {
    const slug = citySlug || nearestCity?.slug || cities[0]?.slug;
    if (slug) router.push(`/deals/${slug}/${category}`);
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // 1. Check if it's a food category
    const foodCat = matchFoodCategory(query);
    if (foodCat) {
      if (nearestCity) {
        router.push(`/deals/${nearestCity.slug}/${foodCat}`);
        return;
      }
      // No saved location — navigate to a search with the food category (use first city)
      router.push(`/deals/${cities[0]?.slug}/${foodCat}`);
      return;
    }

    // 2. Check if it matches a city name directly
    const cityMatch = matchCity(query, cities);
    if (cityMatch) {
      router.push(`/deals/${cityMatch.slug}`);
      return;
    }

    // 3. Geocode the query to find nearest city
    setStatus('loading');
    setStatusMsg('Searching...');
    const geo = await geocodeQuery(query.trim());
    if (!geo) {
      setStatus('error');
      setStatusMsg(`Could not find "${query}". Try a ZIP code, city name, or food type like "burgers".`);
      return;
    }

    const nearest = findNearestCity(geo.lat, geo.lng, cities);
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: geo.lat, lng: geo.lng, label: query.trim() })); } catch {}
    setNearestCity(nearest);
    setStatus('idle');
    router.push(`/deals/${nearest.slug}`);
  };

  const detectGPS = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }
    setGpsStatus('detecting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const city = findNearestCity(lat, lng, cities);
        setNearestCity(city);
        setGpsStatus('found');
        try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat, lng, label: 'GPS' })); } catch {}
        router.push(`/deals/${city.slug}`);
      },
      () => setGpsStatus('error'),
      { timeout: 8000, maximumAge: 300000 }
    );
  };

  return (
    <div className="space-y-5">
      {/* Main search bar */}
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setStatus('idle'); }}
          placeholder="What are you craving? (burgers, pizza, wings...)"
          className="w-full px-5 py-4 text-base border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-5 rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
        >
          {status === 'loading' ? '...' : 'Find Deals →'}
        </button>
      </form>

      {status === 'error' && (
        <p className="text-red-500 text-sm text-center">{statusMsg}</p>
      )}

      {/* Food category quick pills */}
      <div>
        <p className="text-xs text-gray-400 mb-2 text-center font-medium uppercase tracking-wide">Quick browse by food type</p>
        <div className="flex flex-wrap justify-center gap-2">
          {TOP_FOOD_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => navigateToCategory(cat)}
              className="px-4 py-2 rounded-full text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors shadow-sm"
            >
              {FOOD_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* GPS / Location buttons */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 whitespace-nowrap">or find by location</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {savedLocation && nearestCity ? (
          <button
            onClick={() => router.push(`/deals/${nearestCity.slug}`)}
            className="flex-1 sm:flex-none py-2.5 px-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
          >
            📍 Continue near {nearestCity.name}
          </button>
        ) : null}

        {gpsStatus === 'idle' && (
          <button
            onClick={detectGPS}
            className="flex-1 sm:flex-none py-2.5 px-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
          >
            📍 Detect my location automatically
          </button>
        )}
        {gpsStatus === 'detecting' && (
          <div className="flex items-center gap-2 justify-center text-blue-600 text-sm py-2.5">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span>Detecting location...</span>
          </div>
        )}
        {gpsStatus === 'found' && (
          <div className="text-green-600 text-sm text-center py-2.5 flex items-center gap-1 justify-center">
            <span>✅ Loading deals near you...</span>
          </div>
        )}
        {gpsStatus === 'error' && (
          <p className="text-gray-500 text-sm text-center py-2.5">Location unavailable — search above or browse cities below</p>
        )}
      </div>

      {/* Browse all cities hint */}
      <div className="text-center">
        <a href="#cities" className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
          No location? Browse all cities ↓
        </a>
      </div>
    </div>
  );
}
