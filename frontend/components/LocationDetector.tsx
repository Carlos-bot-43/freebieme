'use client';

import { useState, useEffect, FormEvent } from 'react';
import { CityConfig, distanceMiles } from '../lib/types';
import { useRouter } from 'next/navigation';

interface LocationDetectorProps {
  cities: CityConfig[];
}

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

function findNearestCity(lat: number, lng: number, cities: CityConfig[]): CityConfig {
  let nearest = cities[0];
  let minDist = Infinity;
  for (const city of cities) {
    const dist = distanceMiles(lat, lng, city.center.lat, city.center.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return nearest;
}

export default function LocationDetector({ cities }: LocationDetectorProps) {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [gpsMessage, setGpsMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'error'>('idle');
  const [searchMessage, setSearchMessage] = useState('');
  const [savedLocation, setSavedLocation] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const router = useRouter();

  // Check sessionStorage for a remembered location
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem('freebieme_location');
      if (cached) setSavedLocation(JSON.parse(cached));
    } catch {}
  }, []);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('error');
      setGpsMessage('Geolocation not supported by your browser');
      return;
    }

    setGpsStatus('detecting');
    setGpsMessage('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude, cities);
        setGpsStatus('found');
        setGpsMessage(`Found you near ${nearest.display}! Loading deals...`);
        try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: latitude, lng: longitude, label: 'GPS' })); } catch {}
        setTimeout(() => router.push(`/deals/${nearest.slug}`), 800);
      },
      (error) => {
        setGpsStatus('error');
        setGpsMessage(
          error.code === 1
            ? 'Location access denied. Search below or choose a city.'
            : 'Could not detect location. Search below or choose a city.'
        );
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchStatus('searching');
    setSearchMessage('Searching...');

    const result = await geocodeQuery(searchQuery.trim());
    if (!result) {
      setSearchStatus('error');
      setSearchMessage(`Could not find "${searchQuery}". Try a different ZIP code or city name.`);
      return;
    }

    const nearest = findNearestCity(result.lat, result.lng, cities);
    setSearchStatus('found');
    setSearchMessage(`Found deals near ${nearest.display}! Loading...`);
    try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat: result.lat, lng: result.lng, label: searchQuery.trim() })); } catch {}
    setTimeout(() => router.push(`/deals/${nearest.slug}`), 600);
  };

  const handleUseSavedLocation = () => {
    if (!savedLocation) return;
    const nearest = findNearestCity(savedLocation.lat, savedLocation.lng, cities);
    router.push(`/deals/${nearest.slug}`);
  };

  return (
    <div className="space-y-4">
      {/* Saved location quick access */}
      {savedLocation && gpsStatus === 'idle' && (
        <button
          onClick={handleUseSavedLocation}
          className="w-full py-2.5 px-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 font-medium hover:bg-green-100 transition-colors flex items-center justify-between"
        >
          <span>📍 Continue near {savedLocation.label}</span>
          <span className="text-green-600 text-xs">use this →</span>
        </button>
      )}
      {/* GPS button */}
      <div className="text-center">
        {gpsStatus === 'idle' && (
          <button
            onClick={detectLocation}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            📍 Detect My Location
          </button>
        )}
        {gpsStatus === 'detecting' && (
          <div className="flex items-center gap-2 justify-center text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
            <span className="text-sm">{gpsMessage}</span>
          </div>
        )}
        {gpsStatus === 'found' && (
          <div className="text-green-600 font-medium flex items-center gap-2 justify-center text-sm">
            <span>✅</span>
            <span>{gpsMessage}</span>
          </div>
        )}
        {gpsStatus === 'error' && (
          <p className="text-gray-500 text-sm">{gpsMessage}</p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or search by ZIP / city</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Location search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Enter ZIP code or city name..."
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          disabled={searchStatus === 'searching'}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {searchStatus === 'searching' ? '...' : 'Go'}
        </button>
      </form>

      {searchStatus === 'found' && (
        <p className="text-green-600 text-sm text-center flex items-center gap-1 justify-center">
          <span>✅</span> {searchMessage}
        </p>
      )}
      {searchStatus === 'error' && (
        <p className="text-red-500 text-sm text-center">{searchMessage}</p>
      )}
    </div>
  );
}
