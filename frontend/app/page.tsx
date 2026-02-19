import Link from 'next/link';
import { getCities, getAvailableCities } from '../lib/data';
import LocationDetector from '../components/LocationDetector';

export const dynamic = 'force-static';

export default function HomePage() {
  const cities = getCities();
  const availableCitySlugs = new Set(getAvailableCities());

  const availableCities = cities.filter((c) => availableCitySlugs.has(c.slug));
  const sortedCities = [...availableCities].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="text-6xl mb-4">🍔</div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          FreebieMe
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Free food &amp; deals at restaurants near you
        </p>
        <p className="text-sm text-gray-500 mb-10">
          Birthday freebies, app deals, sign-up bonuses &amp; more — all in one place
        </p>

        {/* Location detector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 max-w-md mx-auto">
          <p className="text-sm text-gray-600 mb-4 font-medium">
            Find deals near you automatically
          </p>
          <LocationDetector cities={cities} />
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 mb-10">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{availableCities.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Cities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">20</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Chains</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Free</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Always</div>
          </div>
        </div>
      </div>

      {/* City grid */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Browse by City
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {sortedCities.map((city) => (
            <Link
              key={city.slug}
              href={`/deals/${city.slug}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-200 transition-all duration-200 group"
            >
              <div className="font-medium text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                {city.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {(city.population / 1000000).toFixed(1)}M metro
              </div>
            </Link>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: '📍', title: 'Find Your City', desc: 'Auto-detect or pick from our list of 25 metro areas' },
              { emoji: '🎯', title: 'Browse Deals', desc: 'Filter by deal type, distance, or app requirements' },
              { emoji: '🆓', title: 'Claim for Free', desc: 'Click through to the official restaurant page to redeem' },
            ].map((step) => (
              <div key={step.title} className="text-center p-4">
                <div className="text-3xl mb-2">{step.emoji}</div>
                <div className="font-medium text-gray-900 mb-1">{step.title}</div>
                <div className="text-sm text-gray-500">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
