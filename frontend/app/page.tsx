import { Metadata } from 'next';
import Link from 'next/link';
import {
  getCities,
  getAvailableCities,
  getCityDealCount,
  getChainCount,
  getUniqueDealGroupCount,
  getHotDealsPreview,
} from '../lib/data';
import HomepageSearch from '../components/HomepageSearch';
import BirthdayReminderLink from '../components/BirthdayReminderLink';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'FreebieMe — Free Food Deals Near You',
  description: 'Birthday freebies, app deals, and sign-up bonuses at 38+ restaurant chains across 79 US cities. Always free, no sign-up.',
  openGraph: {
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Birthday freebies, app deals, and sign-up bonuses. Always free, no sign-up.',
    images: [{ url: 'https://freebieme.vercel.app/opengraph-image', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FreebieMe — Free Food Deals Near You',
    description: 'Birthday freebies, app deals, and sign-up bonuses near you.',
  },
};

const CLAIM_BADGE: Record<string, string> = {
  instant: 'Right now',
  same_day_setup: 'Today',
  advance_required: 'Plan ahead',
  birthday_only: 'Birthday',
};

export default function HomePage() {
  const cities = getCities();
  const availableCitySlugs = new Set(getAvailableCities());
  const availableCities = cities.filter(c => availableCitySlugs.has(c.slug));
  const sortedCities = [...availableCities].sort(
    (a, b) => a.priority - b.priority || a.name.localeCompare(b.name)
  );
  const citiesWithCounts = sortedCities.map(city => ({
    ...city,
    dealCount: getCityDealCount(city.slug),
  }));

  const chainCount = getChainCount();
  const uniqueGroupCount = getUniqueDealGroupCount();
  const hotDeals = getHotDealsPreview(cities).slice(0, 3);

  // --- JSON-LD (kept for SEO, invisible to user) -------------------------------
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FreebieMe',
    url: 'https://freebieme.vercel.app',
    description: `Find free food deals at ${chainCount}+ restaurant chains across 79 US cities.`,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: 'https://freebieme.vercel.app/deals/{search_term_string}' },
      'query-input': 'required name=search_term_string',
    },
  };
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FreebieMe',
    url: 'https://freebieme.vercel.app',
    description: 'FreebieMe aggregates free food deals, birthday freebies, and restaurant rewards across the US.',
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
          text: `FreebieMe tracks birthday freebies, app deals, sign-up bonuses, and rewards programs at ${chainCount}+ restaurant chains across 79 US cities.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How do I get free food at restaurants?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sign up for restaurant rewards apps (Chipotle, McDonald\'s, Starbucks all give free items just for joining), register your birthday for free birthday food at 20+ chains, and use FreebieMe near-me to find deals sorted by distance.',
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqHomepageSchema) }} />

      <main className="min-h-screen bg-[#FAF7F2]">
        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Soft warm gradient blob */}
          <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[860px] rounded-full bg-gradient-to-br from-orange-200/40 via-amber-100/40 to-rose-100/40 blur-3xl" />

          <div className="relative max-w-2xl mx-auto px-5 pt-16 pb-10 text-center">
            <h1 className="text-5xl sm:text-6xl font-semibold text-stone-900 tracking-tight leading-[1.05] mb-4">
              What&rsquo;s free
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">
                near you?
              </span>
            </h1>
            <p className="text-stone-500 text-base sm:text-lg mb-8 max-w-md mx-auto">
              Birthday freebies, app deals, sign-up bonuses at {chainCount}+ chains. No sign-up.
            </p>

            <Link
              href="/near-me"
              className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-base font-medium px-7 py-4 rounded-full shadow-sm transition-all duration-200"
            >
              Find food near me
              <span aria-hidden>→</span>
            </Link>
          </div>
        </section>

        {/* ─── Search ─────────────────────────────────────────────────── */}
        <section className="max-w-xl mx-auto px-5 -mt-2 pb-10">
          <div className="bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-stone-100 p-4">
            <HomepageSearch cities={availableCities} />
          </div>
        </section>

        {/* ─── Hot now (3 cards max) ──────────────────────────────────── */}
        {hotDeals.length > 0 && (
          <section className="max-w-3xl mx-auto px-5 pb-12">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-[0.18em] mb-4">
              Hot right now
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {hotDeals.map(deal => (
                <Link
                  key={deal.category}
                  href={`/deals/${deal.citySlug}`}
                  className="group bg-white rounded-2xl border border-stone-100 p-5 hover:border-stone-300 transition-colors"
                >
                  <div className="text-2xl mb-3">{deal.emoji}</div>
                  <div className="font-medium text-stone-900 text-base leading-snug mb-1.5 line-clamp-2">
                    {deal.valueSummary}
                  </div>
                  <div className="text-xs text-stone-400 flex items-center gap-2">
                    <span>{deal.chainName}</span>
                    <span className="text-stone-200">·</span>
                    <span>{deal.cityName}</span>
                    {CLAIM_BADGE[deal.claimType] && (
                      <>
                        <span className="text-stone-200">·</span>
                        <span>{CLAIM_BADGE[deal.claimType]}</span>
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── Cities ─────────────────────────────────────────────────── */}
        <section id="cities" className="max-w-3xl mx-auto px-5 pb-16 scroll-mt-4">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xs font-medium text-stone-400 uppercase tracking-[0.18em]">
              Cities
            </h2>
            <span className="text-xs text-stone-400">{availableCities.length}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {citiesWithCounts.slice(0, 12).map(c => (
              <Link
                key={c.slug}
                href={`/deals/${c.slug}`}
                className="group flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 hover:border-stone-300 transition-colors"
              >
                <span className="text-sm font-medium text-stone-800">{c.name}</span>
                <span className="text-xs text-stone-400 group-hover:text-stone-600">
                  {c.dealCount.toLocaleString()}
                </span>
              </Link>
            ))}
          </div>
          {citiesWithCounts.length > 12 && (
            <details className="mt-3">
              <summary className="text-sm text-stone-500 cursor-pointer hover:text-stone-700 select-none">
                Show all {citiesWithCounts.length} cities
              </summary>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {citiesWithCounts.slice(12).map(c => (
                  <Link
                    key={c.slug}
                    href={`/deals/${c.slug}`}
                    className="group flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3 hover:border-stone-300 transition-colors"
                  >
                    <span className="text-sm font-medium text-stone-800">{c.name}</span>
                    <span className="text-xs text-stone-400 group-hover:text-stone-600">
                      {c.dealCount.toLocaleString()}
                    </span>
                  </Link>
                ))}
              </div>
            </details>
          )}
        </section>

        {/* ─── Stats strip ─────────────────────────────────────────────── */}
        <section className="max-w-3xl mx-auto px-5 pb-16">
          <div className="grid grid-cols-3 gap-px bg-stone-100 rounded-2xl overflow-hidden border border-stone-100">
            <Stat label="Cities" value={availableCities.length} />
            <Stat label="Chains" value={`${chainCount}+`} />
            <Stat label="Deals" value={uniqueGroupCount > 0 ? `${uniqueGroupCount}+` : '200+'} />
          </div>
        </section>

        {/* ─── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t border-stone-100">
          <div className="max-w-3xl mx-auto px-5 py-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-stone-400">
            <div>
              <span className="font-medium text-stone-700">FreebieMe</span>
              <span className="mx-2 text-stone-300">·</span>
              <span>Always free, no sign-up</span>
            </div>
            <div className="flex items-center gap-5">
              <BirthdayReminderLink />
              <Link href="/chains" className="hover:text-stone-700 transition-colors">
                Chains
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white px-4 py-5 text-center">
      <div className="text-xl sm:text-2xl font-semibold text-stone-900 tracking-tight">{value}</div>
      <div className="text-[10px] text-stone-400 uppercase tracking-[0.18em] mt-1">{label}</div>
    </div>
  );
}
