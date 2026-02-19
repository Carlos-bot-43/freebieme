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
      const { lat, lng, label } = JSON.parse(saved);
      const cities = citiesData as CityConfig[];
      let nearest = cities[0];
      let minDist = Infinity;
      for (const city of cities) {
        const d = distanceMiles(lat, lng, city.center.lat, city.center.lng);
        if (d < minDist) { minDist = d; nearest = city; }
      }
      // suppress unused variable warning
      void label;
      setNearCity(nearest);
    } catch {}
  }, []);

  if (!nearCity) return null;

  return (
    <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <div>
        <span className="text-sm text-green-800 font-medium">📍 Near {nearCity.name}</span>
        <span className="text-xs text-green-600 ml-2">from your last visit</span>
      </div>
      <Link
        href="/near-me"
        className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
      >
        See deals →
      </Link>
    </div>
  );
}
