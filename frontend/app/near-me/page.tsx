'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CityConfig, CityDeals, groupDeals, distanceMiles, DealGroup } from '../../lib/types';
import BirthdayBanner from '../../components/BirthdayBanner';

// Minimal city data baked in (avoids a separate fetch)
import citiesData from '../../lib/cities-static.json';

type ClaimType = 'instant' | 'same_day_setup' | 'advance_required' | 'birthday_only';

function formatDist(d: number) {
  return d < 0.1 ? '< 0.1 mi' : `${d.toFixed(1)} mi`;
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

const CLAIM_LABELS: Record<ClaimType, { label: string; color: string }> = {
  instant:          { label: '⚡ Right now',     color: 'bg-green-100 text-green-800' },
  same_day_setup:   { label: '📲 Today',          color: 'bg-yellow-100 text-yellow-800' },
  advance_required: { label: '📅 Plan ahead',     color: 'bg-orange-100 text-orange-800' },
  birthday_only:    { label: '🎂 Birthday month', color: 'bg-pink-100 text-pink-800' },
};

export default function NearMePage() {
  const cities = citiesData as CityConfig[];

  const [step, setStep] = useState<'locating' | 'fetching' | 'ready' | 'error'>('locating');
  const [errorMsg, setErrorMsg] = useState('');
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [nearestCity, setNearestCity] = useState<CityConfig | null>(null);
  const [cityDeals, setCityDeals] = useState<CityDeals | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Step 1: Get location
  useEffect(() => {
    // Check saved location first
    try {
      const saved = sessionStorage.getItem('freebieme_location');
      if (saved) {
        const { lat, lng } = JSON.parse(saved);
        setUserLat(lat); setUserLng(lng);
        const { city } = findNearestCity(lat, lng, cities);
        setNearestCity(city);
        setStep('fetching');
        return;
      }
    } catch {}

    // Auto-request GPS
    if (!navigator.geolocation) {
      setErrorMsg('Geolocation not supported. Search for your city below.');
      setStep('error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat); setUserLng(lng);
        try { sessionStorage.setItem('freebieme_location', JSON.stringify({ lat, lng, label: 'GPS' })); } catch {}
        const { city } = findNearestCity(lat, lng, cities);
        setNearestCity(city);
        setStep('fetching');
      },
      () => {
        setErrorMsg('Location access denied. Browse by city below.');
        setStep('error');
      },
      { timeout: 8000, maximumAge: 300000 }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: Fetch city deals
  useEffect(() => {
    if (step !== 'fetching' || !nearestCity) return;
    fetch(`/data/deals/${nearestCity.slug}.json`)
      .then(r => r.json())
      .then((data: CityDeals) => { setCityDeals(data); setStep('ready'); })
      .catch(() => { setErrorMsg('Failed to load deals. Try again.'); setStep('error'); });
  }, [step, nearestCity]);

  // Compute groups filtered to actionable deals, sorted by distance
  const { instant, today, planAhead, allGroups } = useMemo(() => {
    if (!cityDeals || userLat === null || userLng === null) return { instant: [], today: [], planAhead: [], allGroups: [] };
    const all = groupDeals(cityDeals.deals, userLat, userLng);

    // Instant: can use right now (happy hour + walk-in)
    const instant = all.filter(g => g.claim_type === 'instant' && (g.nearestDistance ?? 999) <= 10);
    // Today: signup bonus or app deal — claimable same visit
    const today = all.filter(g => g.claim_type === 'same_day_setup' && (g.nearestDistance ?? 999) <= 5);
    // Plan ahead: birthday deals only (most valuable "plan ahead" deals with specific freebies)
    // We exclude advance_required (rewards programs) as those are long-term, not "get free food soon"
    const planAhead = all.filter(g => g.claim_type === 'birthday_only').slice(0, 5);

    return { instant, today, planAhead, allGroups: all };
  }, [cityDeals, userLat, userLng]);

  const displayedToday = showAll ? today : today.slice(0, 6);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-lg font-bold text-gray-900 hover:text-blue-700">
            🍔 FreebieMe
          </Link>
          <span className="text-gray-300">›</span>
          <span className="text-sm text-gray-600 font-medium">Near Me</span>
          {nearestCity && step === 'ready' && (
            <Link href={`/deals/${nearestCity.slug}`} className="ml-auto text-xs text-blue-600 hover:text-blue-800">
              All {nearestCity.name} deals →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Locating state */}
        {step === 'locating' && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4 animate-bounce">📍</div>
            <p className="text-gray-600 font-medium">Finding your location...</p>
            <p className="text-sm text-gray-400 mt-1">Allow location access for the best results</p>
          </div>
        )}

        {/* Fetching state */}
        {step === 'fetching' && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🍔</div>
            <p className="text-gray-600 font-medium">Loading deals near {nearestCity?.name}...</p>
          </div>
        )}

        {/* Error state — GPS denied or unavailable */}
        {step === 'error' && (
          <div className="py-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">📍</div>
              <p className="text-gray-700 font-medium mb-1">{errorMsg}</p>
              <p className="text-sm text-gray-400">Pick a city below to see deals</p>
            </div>
            {/* Popular cities quick-pick */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['new-york-ny', 'los-angeles-ca', 'chicago-il', 'houston-tx', 'miami-fl', 'dallas-tx', 'atlanta-ga', 'seattle-wa'].map((slug) => {
                const city = cities.find(c => c.slug === slug);
                if (!city) return null;
                return (
                  <Link
                    key={slug}
                    href={`/deals/${slug}`}
                    className="block bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-700 hover:border-blue-300 hover:text-blue-700 hover:bg-blue-50 transition-colors text-center"
                  >
                    {city.name}
                  </Link>
                );
              })}
            </div>
            <div className="text-center">
              <Link href="/" className="text-sm text-blue-600 hover:underline">
                ← See all 74 cities →
              </Link>
            </div>
          </div>
        )}

        {/* Ready state */}
        {step === 'ready' && nearestCity && (
          <>
            {/* Location header */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Free food near you
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                📍 Showing deals near <strong>{nearestCity.name}</strong>
                {userLat && (
                  <Link href={`/deals/${nearestCity.slug}`} className="ml-2 text-blue-600 hover:underline">
                    See all →
                  </Link>
                )}
              </p>
            </div>

            {/* Birthday month banner */}
            <BirthdayBanner />

            {/* ⚡ INSTANT section — happy hour and walk-in deals */}
            {instant.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="bg-green-100 px-2 py-0.5 rounded-full">⚡ Use right now</span>
                  <span className="text-gray-400 font-normal normal-case">No setup needed</span>
                </h2>
                <div className="space-y-2">
                  {instant.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} userLat={userLat!} userLng={userLng!} />
                  ))}
                </div>
              </section>
            )}

            {instant.length === 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-6 text-sm text-yellow-800">
                No instant deals available right now near you — happy hour may not be active.
              </div>
            )}

            {/* No same-day deals fallback — only show if also no instant deals */}
            {today.length === 0 && instant.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6 text-sm text-blue-800">
                No deals with fast setup found near you right now. Try the full city page to see all deals including birthday freebies and rewards programs.
              </div>
            )}

            {/* 📲 TODAY section — signup bonuses and app deals */}
            {today.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-yellow-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="bg-yellow-100 px-2 py-0.5 rounded-full">📲 Get it today</span>
                  <span className="text-gray-400 font-normal normal-case">~10 min setup, then free food</span>
                </h2>
                <div className="space-y-2">
                  {displayedToday.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} userLat={userLat!} userLng={userLng!} />
                  ))}
                </div>
                {today.length > 6 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full mt-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                  >
                    Show {today.length - 6} more deals →
                  </button>
                )}
              </section>
            )}

            {/* 🎂 PLAN AHEAD section — birthday + advance-required deals */}
            {planAhead.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-pink-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="bg-pink-100 px-2 py-0.5 rounded-full">🎂 Plan Ahead</span>
                  <span className="text-gray-400 font-normal normal-case">Register now, free food later</span>
                </h2>
                <div className="space-y-2">
                  {planAhead.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} userLat={userLat!} userLng={userLng!} />
                  ))}
                </div>
              </section>
            )}

            {/* Browse all link */}
            <div className="border-t border-gray-200 pt-6 text-center">
              <p className="text-sm text-gray-500 mb-3">See all deals including rewards programs →</p>
              <Link
                href={`/deals/${nearestCity.slug}`}
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors"
              >
                All {allGroups.length} deals in {nearestCity.name} →
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const NEAR_ME_VALUE_COLORS: Record<string, string> = {
  birthday: 'text-pink-700',
  signup_bonus: 'text-purple-700',
  app_deal: 'text-blue-700',
  happy_hour: 'text-amber-700',
  rewards_program: 'text-green-700',
  freebie: 'text-emerald-700',
  bogo: 'text-orange-700',
  discount: 'text-red-700',
};

// Compact deal card for near-me page — optimised for speed scanning
function NearMeDealCard({ group, userLat: _userLat, userLng: _userLng }: { group: DealGroup; userLat: number; userLng: number }) {
  const dist = group.nearestDistance;
  const claimConfig = CLAIM_LABELS[group.claim_type as ClaimType] || CLAIM_LABELS.same_day_setup;
  const valueColor = NEAR_ME_VALUE_COLORS[group.deal_type] || 'text-gray-900';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-gray-900 text-sm">{group.location_name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${claimConfig.color}`}>
            {claimConfig.label}
          </span>
        </div>
        {/* value_summary is the headline — what you actually get */}
        <p className={`text-base font-bold leading-snug ${valueColor}`}>
          {group.value_summary || group.title}
        </p>
        {dist !== null && (
          <p className="text-xs text-gray-400 mt-0.5">
            📍 {formatDist(dist)} away
            {group.nearestLocation?.address && ` · ${group.nearestLocation.address.split(',')[0]}`}
          </p>
        )}
      </div>
      <a
        href={group.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
      >
        Get it →
      </a>
    </div>
  );
}
