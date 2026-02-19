import { Metadata } from 'next';
import Link from 'next/link';
import { getCities, getAvailableCities, getCityDealCount, getChainCount, getUniqueDealGroupCount } from '../lib/data';
import HomepageSearch from '../components/HomepageSearch';
import CityGrid from '../components/CityGrid';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FreebieMe — Free Food Deals Near You | Burgers, Pizza, Chicken & More',
  description: 'FreebieMe — Find free burgers, pizza, chicken and more near you. Birthday freebies, app deals and sign-up bonuses at 34+ restaurant chains across 74 US cities.',
  openGraph: {
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Find free burgers, pizza, chicken and more. Birthday freebies, app deals and sign-up bonuses at 34+ chains across 74 US cities.',
  },
  twitter: {
    card: 'summary',
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Find free burgers, pizza, chicken and more near you.',
  },
};

export default function HomePage() {
  const cities = getCities();
  const availableCitySlugs = new Set(getAvailableCities());

  const availableCities = cities.filter((c) => availableCitySlugs.has(c.slug));
  const sortedCities = [...availableCities]
    .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));

  const citiesWithCounts = sortedCities.map((city) => ({
    ...city,
    dealCount: getCityDealCount(city.slug),
  }));

  const chainCount = getChainCount();
  const uniqueGroupCount = getUniqueDealGroupCount();

  const dealTypeHighlights = [
    { emoji: '🎂', title: 'Birthday Freebies', desc: 'Free food on your special day — no purchase required at most chains' },
    { emoji: '📱', title: 'App Deals', desc: 'Download the app once, save money forever — exclusive discounts' },
    { emoji: '🎁', title: 'Sign Up Bonuses', desc: 'Create an account and get instant free food — works same day' },
    { emoji: '⭐', title: 'Rewards Points', desc: 'Earn points with every purchase, redeem for free meals' },
    { emoji: '🕐', title: 'Happy Hour', desc: 'Half-price drinks & apps at Sonic, Applebee\'s, Chili\'s and more' },
    { emoji: '🆓', title: 'Freebies', desc: 'Limited-time free items — check back often for new offers' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-14 pb-8 text-center">
        <div className="text-5xl mb-3">🍔</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
          Find Free Food Near You
        </h1>
        <p className="text-lg text-gray-600 mb-1">
          Birthday freebies · App deals · Sign-up bonuses · Happy hour
        </p>
        <p className="text-sm text-gray-400 mb-8">
          At <strong>{chainCount}+</strong> restaurant chains across <strong>{availableCities.length}</strong> US cities
        </p>

        {/* Food-first search */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 mb-8 text-left">
          <HomepageSearch cities={availableCities} />
        </div>

        {/* Stats bar */}
        <div className="flex justify-center gap-8 sm:gap-12 mb-4">
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
              {uniqueGroupCount > 0 ? `${uniqueGroupCount}+` : '200+'}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">Unique Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl font-bold text-green-500">$0</div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">To Use</div>
          </div>
        </div>
      </div>

      {/* City grid */}
      <div id="cities" className="max-w-4xl mx-auto px-4 pb-6 scroll-mt-4">
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
      <div className="max-w-4xl mx-auto px-4 pb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { emoji: '🍔', title: 'Search by craving', desc: 'Type "burgers", "pizza" or "coffee" — or tap a food category to see matching deals near you.' },
              { emoji: '🎯', title: 'Browse unique deals', desc: 'Each deal card shows all nearby locations, their distance, and exactly what you get for free.' },
              { emoji: '🆓', title: 'Claim it free', desc: 'Tap "Get deal →" to go to the restaurant\'s official page and redeem your freebie.' },
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
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-gray-900 text-lg mb-1">🍔 FreebieMe</div>
              <p className="text-sm text-gray-500 max-w-xs">
                Free restaurant deals, birthday freebies, and app bonuses across {availableCities.length}+ US cities.
              </p>
            </div>
            <div className="text-sm text-gray-500 space-y-1">
              <p>Always free to use · No sign-up required</p>
              <p className="text-xs text-gray-400">Deals subject to change · Always verify at the restaurant</p>
              <p className="text-xs text-gray-400">FreebieMe is not affiliated with any restaurant chain</p>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1">
            {sortedCities.slice(0, 20).map((city) => (
              <Link
                key={city.slug}
                href={`/deals/${city.slug}`}
                className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
