'use client';

import { useState, useEffect } from 'react';
import { CityConfig } from '../lib/types';
import { useRouter } from 'next/navigation';

interface LocationDetectorProps {
  cities: CityConfig[];
}

export default function LocationDetector({ cities }: LocationDetectorProps) {
  const [status, setStatus] = useState<'idle' | 'detecting' | 'found' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const router = useRouter();

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Geolocation not supported by your browser');
      return;
    }

    setStatus('detecting');
    setMessage('Detecting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Find nearest city
        let nearest = cities[0];
        let minDist = Infinity;
        for (const city of cities) {
          const dlat = city.center.lat - latitude;
          const dlng = city.center.lng - longitude;
          const dist = Math.sqrt(dlat * dlat + dlng * dlng);
          if (dist < minDist) {
            minDist = dist;
            nearest = city;
          }
        }

        setStatus('found');
        setMessage(`Found you near ${nearest.display}! Loading deals...`);

        // Navigate to city deals page
        setTimeout(() => {
          router.push(`/deals/${nearest.slug}`);
        }, 800);
      },
      (error) => {
        setStatus('error');
        setMessage(
          error.code === 1
            ? 'Location access denied. Choose a city below.'
            : 'Could not detect location. Choose a city below.'
        );
      },
      { timeout: 10000, maximumAge: 300000 }
    );
  };

  return (
    <div className="text-center">
      {status === 'idle' && (
        <button
          onClick={detectLocation}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
        >
          📍 Detect My Location
        </button>
      )}
      {status === 'detecting' && (
        <div className="flex items-center gap-2 justify-center text-blue-600">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
          <span>{message}</span>
        </div>
      )}
      {status === 'found' && (
        <div className="text-green-600 font-medium flex items-center gap-2 justify-center">
          <span>✅</span>
          <span>{message}</span>
        </div>
      )}
      {status === 'error' && (
        <p className="text-gray-500 text-sm">{message}</p>
      )}
    </div>
  );
}
