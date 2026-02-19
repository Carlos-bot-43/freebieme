import { Metadata } from 'next';
import Link from 'next/link';
import { getCities, getAvailableCities, getCityDealCount, getChainCount, getUniqueDealGroupCount } from '../lib/data';
import HomepageSearch from '../components/HomepageSearch';
import CityGrid from '../components/CityGrid';
import NearMePreview from '../components/NearMePreview';
import BirthdayBanner from '../components/BirthdayBanner';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FreebieMe — Free Food Deals Near You | Burgers, Pizza, Chicken & More',
  description: 'FreebieMe — Find free burgers, pizza, chicken and more near you. Birthday freebies, app deals and sign-up bonuses at 34+ restaurant chains across 74 US cities.',
  openGraph: {
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Find free burgers, pizza, chicken and more. Birthday freebies, app deals and sign-up bonuses at 34+ chains across 74 US cities.',
    images: [{ url: 'https://freebieme.vercel.app/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Find free burgers, pizza, chicken and more near you.',
  },
};

// Popular food categories for footer SEO links — category: [city slugs]
const FOOTER_CATEGORY_CITIES: Record<string, { label: string; cities: string[] }> = {
  burgers: { label: 'Burger Deals', cities: ['new-york-ny', 'chicago-il', 'los-angeles-ca', 'houston-tx'] },
  pizza: { label: 'Pizza Deals', cities: ['new-york-ny', 'chicago-il', 'los-angeles-ca', 'philadelphia-pa'] },
  chicken: { label: 'Chicken Deals', cities: ['atlanta-ga', 'dallas-tx', 'houston-tx', 'chicago-il'] },
  coffee: { label: 'Coffee Deals', cities: ['seattle-wa', 'new-york-ny', 'los-angeles-ca', 'boston-ma'] },
  breakfast: { label: 'Breakfast Deals', cities: ['new-york-ny', 'chicago-il', 'miami-fl', 'dallas-tx'] },
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

  const cityNameMap = new Map(cities.map((c) => [c.slug, c.name]));

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
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="text-5xl mb-3">🍔</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
          Free food near you
        </h1>
        <p className="text-gray-500 mb-8 text-lg">
          Birthday freebies, app deals, happy hour and more — at {chainCount}+ chains near you
        </p>

        {/* PRIMARY CTA — big, unmissable */}
        <Link
          href="/near-me"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 mb-4"
        >
          📍 Find free food near me →
        </Link>

        <p className="text-xs text-gray-400 mb-6">
          Uses your location · No account needed · Always free
        </p>

        {/* Birthday month banner — shown after 30s on first visit, or active in birth month */}
        <BirthdayBanner />

        {/* Food-first search — secondary action */}
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-5 mb-6 text-left">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-3">Or search by craving</p>
          <NearMePreview />
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

      {/* 4A: Email capture */}
      {/* TODO: Replace "xpwzrjqe" with your actual Formspree form ID from https://formspree.io */}
      <div className="max-w-md mx-auto px-4 mt-2 mb-10">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-3xl mb-3">📬</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Get weekly deal alerts</h2>
          <p className="text-sm text-gray-500 mb-4">New freebies and limited-time deals delivered to your inbox</p>
          <form action="https://formspree.io/f/xpwzrjqe" method="POST" className="flex gap-2">
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Subscribe
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">No spam. Unsubscribe anytime.</p>
        </div>
      </div>

      {/* 6D: Improved footer with SEO category links and about section */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-10">
          {/* About section */}
          <div className="mb-8">
            <div className="font-bold text-gray-900 text-xl mb-2">🍔 FreebieMe</div>
            <p className="text-sm text-gray-600 max-w-2xl leading-relaxed">
              FreebieMe tracks free food deals, birthday freebies, app bonuses, and sign-up rewards at 34+ restaurant chains
              across 74 US cities. We&apos;re a free, no-sign-up tool that helps you find the best restaurant deals near you —
              from McDonald&apos;s and Chipotle to Starbucks and Chick-fil-A. Updated regularly.
            </p>
          </div>

          {/* 6D: Food category links — SEO-friendly internal links */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Popular Food Deal Categories</h3>
            <div className="space-y-3">
              {Object.entries(FOOTER_CATEGORY_CITIES).map(([slug, { label, cities: citySlugs }]) => (
                <div key={slug} className="flex flex-wrap items-center gap-1 text-sm">
                  <span className="text-gray-700 font-medium mr-1">{label} in</span>
                  {citySlugs.map((citySlug, i) => {
                    const cityName = cityNameMap.get(citySlug);
                    if (!cityName) return null;
                    return (
                      <span key={citySlug} className="inline-flex items-center">
                        <Link
                          href={`/deals/${citySlug}/${slug}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {cityName}
                        </Link>
                        {i < citySlugs.length - 1 && <span className="text-gray-300 mx-1">·</span>}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* City links */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">All Cities</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {sortedCities.map((city) => (
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

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Always free to use · No sign-up required · Deals subject to change · Always verify at the restaurant ·{' '}
              FreebieMe is not affiliated with any restaurant chain
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
