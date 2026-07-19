'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CityConfig, CityDeals, groupDeals, distanceMiles, DealGroup } from '../../lib/types';
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

const CLAIM_LABELS: Record<ClaimType, string> = {
  instant:          'Right now',
  same_day_setup:   'Today',
  advance_required: 'Plan ahead',
  birthday_only:    'Birthday',
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

  useEffect(() => {
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

  useEffect(() => {
    if (step !== 'fetching' || !nearestCity) return;
    fetch(`/data/deals/${nearestCity.slug}.json`)
      .then(r => r.json())
      .then((data: CityDeals) => { setCityDeals(data); setStep('ready'); })
      .catch(() => { setErrorMsg('Failed to load deals. Try again.'); setStep('error'); });
  }, [step, nearestCity]);

  const { instant, today, planAhead, allGroups } = useMemo(() => {
    if (!cityDeals || userLat === null || userLng === null) return { instant: [], today: [], planAhead: [], allGroups: [] };
    const all = groupDeals(cityDeals.deals, userLat, userLng);
    const instant = all.filter(g => g.claim_type === 'instant' && (g.nearestDistance ?? 999) <= 10);
    const today = all.filter(g => g.claim_type === 'same_day_setup' && (g.nearestDistance ?? 999) <= 5);
    const planAhead = all.filter(g => g.claim_type === 'birthday_only').slice(0, 5);
    return { instant, today, planAhead, allGroups: all };
  }, [cityDeals, userLat, userLng]);

  const displayedToday = showAll ? today : today.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <header className="bg-[#FAF7F2]/85 backdrop-blur border-b border-stone-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-5 py-3 flex items-center gap-3">
          <Link href="/" className="text-base font-semibold text-stone-900 tracking-tight hover:text-stone-600 transition-colors">
            FreebieMe
          </Link>
          <span className="text-stone-300">›</span>
          <span className="text-sm text-stone-600 font-medium">Near Me</span>
          {nearestCity && step === 'ready' && (
            <Link
              href={`/deals/${nearestCity.slug}`}
              className="ml-auto text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              All {nearestCity.name} →
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-6">
        {step === 'locating' && (
          <div className="text-center py-20">
            <p className="text-stone-700 font-medium">Finding your location…</p>
            <p className="text-sm text-stone-400 mt-1">Allow location access for the best results</p>
          </div>
        )}

        {step === 'fetching' && (
          <div className="text-center py-20">
            <p className="text-stone-700 font-medium">Loading deals near {nearestCity?.name}…</p>
          </div>
        )}

        {step === 'error' && (
          <div className="py-8">
            <div className="text-center mb-8">
              <p className="text-stone-700 font-medium mb-1">{errorMsg}</p>
              <p className="text-sm text-stone-400">Pick a city to see deals</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-6">
              {['new-york-ny', 'los-angeles-ca', 'chicago-il', 'houston-tx', 'miami-fl', 'dallas-tx', 'atlanta-ga', 'seattle-wa'].map((slug) => {
                const city = cities.find(c => c.slug === slug);
                if (!city) return null;
                return (
                  <Link
                    key={slug}
                    href={`/deals/${slug}`}
                    className="block bg-white border border-stone-200 hover:border-stone-300 rounded-xl px-4 py-3 text-sm font-medium text-stone-700 hover:text-stone-900 transition-colors text-center"
                  >
                    {city.name}
                  </Link>
                );
              })}
            </div>
            <div className="text-center">
              <Link href="/" className="text-sm text-stone-500 hover:text-stone-900 transition-colors">
                See all cities →
              </Link>
            </div>
          </div>
        )}

        {step === 'ready' && nearestCity && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight leading-tight">
                Free food near you
              </h1>
              <p className="text-sm text-stone-500 mt-2">
                Showing deals near <strong className="text-stone-700">{nearestCity.name}</strong>
                {userLat && (
                  <>
                    {' · '}
                    <Link href={`/deals/${nearestCity.slug}`} className="text-stone-500 hover:text-stone-900 underline decoration-stone-200 hover:decoration-stone-400 underline-offset-2">
                      see all
                    </Link>
                  </>
                )}
              </p>
            </div>

            {instant.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.18em] mb-3">
                  Use right now
                </h2>
                <div className="space-y-2">
                  {instant.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} />
                  ))}
                </div>
              </section>
            )}

            {today.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.18em] mb-3">
                  Get it today
                </h2>
                <div className="space-y-2">
                  {displayedToday.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} />
                  ))}
                </div>
                {today.length > 6 && !showAll && (
                  <button
                    onClick={() => setShowAll(true)}
                    className="w-full mt-3 py-2.5 text-sm font-medium text-stone-600 hover:text-stone-900 border border-stone-200 hover:border-stone-300 rounded-xl bg-white transition-colors"
                  >
                    Show {today.length - 6} more
                  </button>
                )}
              </section>
            )}

            {planAhead.length > 0 && (
              <section className="mb-10">
                <h2 className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.18em] mb-3">
                  Plan ahead
                </h2>
                <div className="space-y-2">
                  {planAhead.map(group => (
                    <NearMeDealCard key={group.group_id} group={group} />
                  ))}
                </div>
              </section>
            )}

            {today.length === 0 && instant.length === 0 && planAhead.length === 0 && (
              <div className="bg-white border border-stone-200 rounded-2xl p-5 text-sm text-stone-600">
                No fast deals near you right now. Try the full city page for birthday freebies and rewards programs.
              </div>
            )}

            <div className="border-t border-stone-100 pt-6 text-center">
              <p className="text-sm text-stone-500 mb-3">See every deal including rewards programs</p>
              <Link
                href={`/deals/${nearestCity.slug}`}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white px-6 py-3 rounded-full font-medium text-sm transition-colors"
              >
                All {allGroups.length} deals in {nearestCity.name}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NearMeDealCard({ group }: { group: DealGroup }) {
  const dist = group.nearestDistance;
  const claimLabel = CLAIM_LABELS[group.claim_type as ClaimType] || 'Today';

  return (
    <article className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-semibold text-stone-900 uppercase tracking-[0.16em]">
          {group.location_name}
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-400">
          {dist !== null && (
            <span className="font-medium text-stone-500">{formatDist(dist)}</span>
          )}
          <span className="text-stone-200">·</span>
          <span>{claimLabel}</span>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-stone-900 leading-snug tracking-tight mb-3 line-clamp-2">
        {group.value_summary || group.title}
      </h3>
      <a
        href={group.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
      >
        Get it
        <span aria-hidden>→</span>
      </a>
    </article>
  );
}
