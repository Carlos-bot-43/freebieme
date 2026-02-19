import { getCities, getAvailableCities, getCityDealCount, getChainCount } from '../lib/data';
import LocationDetector from '../components/LocationDetector';
import CityGrid from '../components/CityGrid';

export const dynamic = 'force-static';

export default function HomePage() {
  const cities = getCities();
  const availableCitySlugs = new Set(getAvailableCities());

  const availableCities = cities.filter((c) => availableCitySlugs.has(c.slug));
  const sortedCities = [...availableCities]
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  // Get deal counts at build time
  const citiesWithCounts = sortedCities.map((city) => ({
    ...city,
    dealCount: getCityDealCount(city.slug),
  }));

  const totalDeals = citiesWithCounts.reduce((sum, c) => sum + c.dealCount, 0);
  const chainCount = getChainCount();

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
            <div className="text-2xl font-bold text-gray-900">{chainCount}+</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Chains</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {totalDeals > 0 ? `${(totalDeals / 1000).toFixed(0)}K+` : 'Tons'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Deals</div>
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
        <CityGrid cities={citiesWithCounts} />

        {/* How it works */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: '📍', title: 'Find Your City', desc: `Auto-detect location or search by ZIP code, or pick from ${availableCities.length}+ metro areas` },
              { emoji: '🎯', title: 'Browse Deals', desc: 'Filter by deal type, distance, or app requirements — sorted nearest first' },
              { emoji: '🆓', title: 'Claim for Free', desc: 'Click through to the official restaurant page to redeem your deal' },
            ].map((step) => (
              <div key={step.title} className="text-center p-4">
                <div className="text-3xl mb-2">{step.emoji}</div>
                <div className="font-medium text-gray-900 mb-1">{step.title}</div>
                <div className="text-sm text-gray-500">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 pb-4">
          <p>Deal data updated regularly • All deals subject to change • Always verify at the restaurant</p>
          <p className="mt-1">FreebieMe is free, forever 🍔</p>
        </div>
      </div>
    </main>
  );
}
