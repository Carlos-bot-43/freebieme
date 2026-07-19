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

    const foodCat = matchFoodCategory(query);
    if (foodCat) {
      if (nearestCity) {
        router.push(`/deals/${nearestCity.slug}/${foodCat}`);
        return;
      }
      router.push(`/deals/${cities[0]?.slug}/${foodCat}`);
      return;
    }

    const cityMatch = matchCity(query, cities);
    if (cityMatch) {
      router.push(`/deals/${cityMatch.slug}`);
      return;
    }

    setStatus('loading');
    setStatusMsg('Searching…');
    const geo = await geocodeQuery(query.trim());
    if (!geo) {
      setStatus('error');
      setStatusMsg(`Could not find "${query}". Try a ZIP, city name, or food type like "burgers".`);
      return;
    }

    const nearest = findNearestCity(geo.lat, geo.lng, cities);
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: geo.lat, lng: geo.lng, label: query.trim() })); } catch {}
    setNearestCity(nearest);
    setStatus('idle');
    router.push(`/deals/${nearest.slug}`);
  };

  const detectGPS = () => {
    if (!navigator.geolocation) { setGpsStatus('error'); return; }
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
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setStatus('idle'); }}
          placeholder="Burgers, pizza, ZIP or city…"
          className="w-full pl-5 pr-32 py-3.5 text-base bg-white border border-stone-200 rounded-2xl focus:outline-none focus:border-stone-400 focus:ring-2 focus:ring-stone-200 placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="absolute right-1.5 top-1.5 bottom-1.5 bg-stone-900 hover:bg-stone-800 text-white px-5 rounded-xl font-medium transition-colors disabled:opacity-50 text-sm"
        >
          {status === 'loading' ? '…' : 'Search'}
        </button>
      </form>

      {status === 'error' && (
        <p className="text-orange-600 text-xs">{statusMsg}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {TOP_FOOD_CATEGORIES.slice(0, 8).map((cat) => (
          <button
            key={cat}
            onClick={() => navigateToCategory(cat)}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-100 transition-colors"
          >
            {FOOD_CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {(savedLocation && nearestCity) || gpsStatus !== 'idle' ? (
        <div className="pt-2 border-t border-stone-100">
          {savedLocation && nearestCity && (
            <button
              onClick={() => router.push(`/deals/${nearestCity.slug}`)}
              className="text-xs text-stone-600 hover:text-stone-900 transition-colors"
            >
              Continue near {nearestCity.name} →
            </button>
          )}
          {gpsStatus === 'detecting' && (
            <div className="text-xs text-stone-500">Detecting location…</div>
          )}
          {gpsStatus === 'error' && (
            <p className="text-xs text-stone-500">Location unavailable — try search or pick a city below.</p>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-stone-100">
          <button
            onClick={detectGPS}
            className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
          >
            Or use my location →
          </button>
        </div>
      )}
    </div>
  );
}
