import Link from 'next/link';
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

  const dealTypeHighlights = [
    { emoji: '🎂', title: 'Birthday Freebies', desc: 'Free food on your special day — no purchase required at most chains' },
    { emoji: '📱', title: 'App Deals', desc: 'Download the app once, save money forever — exclusive discounts' },
    { emoji: '🎁', title: 'Sign Up Bonuses', desc: 'Create an account and get instant free food — works same day' },
    { emoji: '⭐', title: 'Rewards Points', desc: 'Earn points with every purchase, redeem for free meals' },
    { emoji: '2️⃣', title: 'BOGO Deals', desc: 'Buy one, get one free — great for date nights and sharing' },
    { emoji: '🆓', title: 'Freebies', desc: 'Limited-time free items — check back often for new offers' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
        <div className="text-5xl mb-4">🍔</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          FreebieMe
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Free food &amp; deals at restaurants near you
        </p>
        <p className="text-sm text-gray-500 mb-8 max-w-lg mx-auto">
          Birthday freebies, app deals, sign-up bonuses &amp; more — updated regularly across{' '}
          <strong>{availableCities.length}</strong> US cities
        </p>

        {/* Location detector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 max-w-md mx-auto">
          <p className="text-sm text-gray-600 mb-4 font-medium">
            🎯 Find deals near you
          </p>
          <LocationDetector cities={cities} />
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-6 sm:gap-10 mb-4">
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{availableCities.length}</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Cities</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">{chainCount}+</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Chains</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">
              {totalDeals > 0 ? `${(totalDeals / 1000).toFixed(0)}K+` : 'Tons'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">$0</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">To Use</div>
          </div>
        </div>
      </div>

      {/* City grid */}
      <div className="max-w-4xl mx-auto px-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">
            Browse by City
          </h2>
          <span className="text-xs text-gray-400">{availableCities.length} cities</span>
        </div>
        <CityGrid cities={citiesWithCounts} />
      </div>

      {/* Deal type highlights */}
      <div className="max-w-4xl mx-auto px-4 pb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Types of Deals</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {dealTypeHighlights.map((type) => (
            <div
              key={type.title}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
            >
              <div className="text-2xl mb-2">{type.emoji}</div>
              <div className="font-medium text-gray-900 text-sm mb-1">{type.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{type.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: '📍', title: 'Find Your City', desc: `Auto-detect your location or search by ZIP code — covers ${availableCities.length}+ US metros` },
              { emoji: '🎯', title: 'Browse Deals', desc: 'Filter by deal type, distance, or app requirements. Sorted nearest to you.' },
              { emoji: '🆓', title: 'Claim It Free', desc: 'Tap "Get deal →" to go to the restaurant\'s official page and redeem your freebie.' },
            ].map((step) => (
              <div key={step.title} className="text-center p-4">
                <div className="text-3xl mb-2">{step.emoji}</div>
                <div className="font-medium text-gray-900 mb-1">{step.title}</div>
                <div className="text-sm text-gray-500">{step.desc}</div>
              </div>
            ))}
          </div>

          {/* Popular cities quick links */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Popular Cities</p>
            <div className="flex flex-wrap gap-2">
              {sortedCities.slice(0, 12).map((city) => (
                <Link
                  key={city.slug}
                  href={`/deals/${city.slug}`}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 pb-4">
          <p>Deal data updated regularly • All deals subject to change • Always verify at the restaurant</p>
          <p className="mt-1">FreebieMe is always free 🍔</p>
        </div>
      </div>
    </main>
  );
}
