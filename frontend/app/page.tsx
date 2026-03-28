import { Metadata } from 'next';
import Link from 'next/link';
import { getCities, getAvailableCities, getCityDealCount, getChainCount, getUniqueDealGroupCount, getHotDealsPreview } from '../lib/data';
import HomepageSearch from '../components/HomepageSearch';
import CityGrid from '../components/CityGrid';
import NearMePreview from '../components/NearMePreview';
import BirthdayBanner from '../components/BirthdayBanner';
import EmailCapture from '../components/EmailCapture';
import MealKitBanner from '../components/MealKitBanner';
import CBVBanner from '../components/CBVBanner';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FreebieMe — Free Food Deals Near You | Burgers, Pizza, Chicken, Donuts & More',
  description: 'FreebieMe — Find free burgers, pizza, chicken, donuts and more near you. Birthday freebies, app deals and sign-up bonuses at 41+ restaurant chains across 79 US cities.',
  openGraph: {
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Find free burgers, pizza, chicken, donuts and more. Birthday freebies, app deals and sign-up bonuses at 41+ chains across 79 US cities.',
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

const CLAIM_BADGE: Record<string, { label: string; className: string }> = {
  instant:          { label: '⚡ Right now',     className: 'bg-green-100 text-green-800' },
  same_day_setup:   { label: '📲 Today',          className: 'bg-yellow-100 text-yellow-800' },
  advance_required: { label: '📅 Plan ahead',     className: 'bg-orange-100 text-orange-800' },
  birthday_only:    { label: '🎂 Birthday month', className: 'bg-pink-100 text-pink-800' },
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
  const hotDeals = getHotDealsPreview(cities);

  const dealTypeHighlights = [
    { emoji: '🎂', title: 'Birthday Freebies', desc: 'Free food on your special day — no purchase required at most chains' },
    { emoji: '📱', title: 'App Deals', desc: 'Download the app once, save money forever — exclusive discounts' },
    { emoji: '🎁', title: 'Sign Up Bonuses', desc: 'Create an account and get instant free food — works same day' },
    { emoji: '⭐', title: 'Rewards Points', desc: 'Earn points with every purchase, redeem for free meals' },
    { emoji: '🕐', title: 'Happy Hour', desc: 'Half-price drinks & apps at Sonic, Applebee\'s, Chili\'s and more' },
    { emoji: '🆓', title: 'Freebies', desc: 'Limited-time free items — check back often for new offers' },
  ];

  // Schema.org JSON-LD for homepage
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FreebieMe',
    url: 'https://freebieme.vercel.app',
    description: `Find free food deals, birthday freebies, app deals, and sign-up bonuses at ${chainCount}+ restaurant chains across 79 US cities.`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://freebieme.vercel.app/deals/{search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FreebieMe',
    url: 'https://freebieme.vercel.app',
    description: 'FreebieMe aggregates free food deals, birthday freebies, and restaurant reward programs across the US.',
    sameAs: [],
  };

  const faqHomepageSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is FreebieMe?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `FreebieMe is a free food deal aggregator that tracks birthday freebies, app deals, sign-up bonuses, and rewards programs at ${chainCount}+ restaurant chains across 79 US cities.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get free food at restaurants?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The easiest ways to get free food at restaurants are: (1) Sign up for restaurant rewards apps like Chipotle Rewards, McDonald\'s MyMcDonald\'s Rewards, and Starbucks Rewards — many give free items just for joining. (2) Register your birthday to get birthday freebies — over 20 chains give free food on your birthday. (3) Use the FreebieMe near-me feature to find deals sorted by distance.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which restaurants give free food on your birthday?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Restaurants that give free food on your birthday include: Starbucks (free drink), Chipotle (free entrée), Dairy Queen (free Blizzard), IHOP (free pancakes), Denny\'s (free Grand Slam), Baskin-Robbins (free scoop), Krispy Kreme (free dozen), Firehouse Subs (free medium sub), Wingstop (free 6 wings), and more.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need to create an account to use FreebieMe?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. FreebieMe is completely free to use and requires no sign-up. Browse all restaurant deals by city without creating any account.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqHomepageSchema) }} />
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="text-5xl mb-3">🍔</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-2 tracking-tight">
          Free food deals near you
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

      {/* 🔥 Hot Deals Right Now — teaser section, static at build time */}
      {hotDeals.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🔥 Hot Deals Right Now</h2>
            <span className="text-xs text-gray-400">Updated regularly</span>
          </div>
          {/* Horizontally scrollable on mobile, grid on desktop */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
            {hotDeals.map((deal) => {
              const badge = CLAIM_BADGE[deal.claimType];
              return (
                <Link
                  key={deal.category}
                  href={`/deals/${deal.citySlug}`}
                  className="flex-shrink-0 w-56 sm:w-auto bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-blue-100 transition-all duration-200 block"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{deal.emoji}</span>
                    <span className="font-bold text-gray-900 text-sm truncate">{deal.chainName}</span>
                  </div>
                  <p className="text-sm font-semibold text-blue-700 mb-1.5 leading-snug line-clamp-2">
                    {deal.valueSummary}
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    {badge && (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 truncate ml-auto">{deal.cityName}</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-2 font-medium">Get deal →</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Meal kit affiliate — "More ways to save" */}
      <div className="max-w-md mx-auto px-4 mb-6">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">More ways to save on food</h2>
        <MealKitBanner showAll={true} />
      </div>

      {/* Email capture — birthday deal reminder */}
      <div className="max-w-md mx-auto px-4 mt-2 mb-6">
        <div className="bg-white rounded-2xl border border-pink-100 shadow-sm p-6 text-center">
          <div className="text-3xl mb-3">🎂</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Get your birthday freebies reminder</h2>
          <p className="text-sm text-gray-500 mb-4">
            We&apos;ll email you the full list of free food you qualify for in your birthday month — 20+ chains, nothing to miss.
          </p>
          <EmailCapture context="homepage" />
        </div>
      </div>

      {/* CBV crosslink */}
      <div className="max-w-md mx-auto px-4 mb-10">
        <CBVBanner />
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
    </>
  );
}
