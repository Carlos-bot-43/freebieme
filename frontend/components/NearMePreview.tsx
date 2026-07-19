'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CityConfig, distanceMiles } from '../lib/types';
import citiesData from '../lib/cities-static.json';

export default function NearMePreview() {
  const [nearCity, setNearCity] = useState<CityConfig | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('freebieme_location');
      if (!saved) return;
      const { lat, lng } = JSON.parse(saved);
      const cities = citiesData as CityConfig[];
      let nearest = cities[0];
      let minDist = Infinity;
      for (const city of cities) {
        const d = distanceMiles(lat, lng, city.center.lat, city.center.lng);
        if (d < minDist) { minDist = d; nearest = city; }
      }
      setNearCity(nearest);
    } catch {}
  }, []);

  if (!nearCity) return null;

  return (
    <div className="mb-4 bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <span className="text-sm text-stone-900 font-medium">Near {nearCity.name}</span>
        <span className="text-xs text-stone-400 ml-2">from your last visit</span>
      </div>
      <Link
        href="/near-me"
        className="text-xs font-medium text-stone-900 hover:text-stone-600 transition-colors whitespace-nowrap"
      >
        See deals →
      </Link>
    </div>
  );
}
