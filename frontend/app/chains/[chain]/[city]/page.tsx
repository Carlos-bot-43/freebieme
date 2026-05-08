import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getChain,
  getDealsForChain,
  getChainCityPairs,
  getLocationCountForChainCity,
} from '../../../../lib/normalized-data';
import { getCities } from '../../../../lib/data';
import { DEAL_TYPE_LABELS } from '../../../../lib/types';
import { confidenceBucket, freshnessLabel } from '../../../../lib/normalized-types';

interface PageProps {
  params: Promise<{ chain: string; city: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  // ~38 chains × ~79 cities × ~70% coverage ≈ 2,000 long-tail SEO pages.
  return getChainCityPairs();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chain, city } = await params;
  const c = getChain(chain);
  const cityConfig = getCities().find(x => x.slug === city);
  if (!c || !cityConfig) return { title: 'Not Found - FreebieMe' };
  const locCount = getLocationCountForChainCity(chain, city);
  return {
    title: `${c.name} Free Food Deals in ${cityConfig.name} (${locCount} locations) | FreebieMe`,
    description: `Active ${c.name} freebies, app deals, and rewards available at ${locCount} locations in ${cityConfig.display}.`,
    alternates: { canonical: `https://freebieme.vercel.app/chains/${c.slug}/${city}` },
  };
}

export default async function ChainCityPage({ params }: PageProps) {
  const { chain, city } = await params;
  const c = getChain(chain);
  const cityConfig = getCities().find(x => x.slug === city);
  if (!c || !cityConfig) notFound();

  const deals = getDealsForChain(chain).sort((a, b) => b.confidence_score - a.confidence_score);
  const locCount = getLocationCountForChainCity(chain, city);

  const offers = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: `${c.name} Free Food Deals in ${cityConfig.display}`,
    itemListElement: deals.map((d, i) => ({
      '@type': 'Offer',
      position: i + 1,
      name: d.title,
      description: d.description,
      url: d.source_url,
      price: '0',
      priceCurrency: 'USD',
      availability: d.valid_until ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
      areaServed: {
        '@type': 'City',
        name: cityConfig.name,
      },
      seller: {
        '@type': 'FoodEstablishment',
        name: c.name,
        servesCuisine: c.cuisine.join(', '),
        url: c.rewards_url,
      },
      eligibleCustomerType: 'https://schema.org/RewardCustomer',
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'FreebieMe', item: 'https://freebieme.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Chains', item: 'https://freebieme.vercel.app/chains' },
      { '@type': 'ListItem', position: 3, name: c.name, item: `https://freebieme.vercel.app/chains/${c.slug}` },
      { '@type': 'ListItem', position: 4, name: cityConfig.name, item: `https://freebieme.vercel.app/chains/${c.slug}/${city}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(offers) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <nav className="text-xs text-gray-500 mb-3">
          <Link href="/" className="hover:underline">Home</Link>
          {' › '}
          <Link href="/chains" className="hover:underline">Chains</Link>
          {' › '}
          <Link href={`/chains/${c.slug}`} className="hover:underline">{c.name}</Link>
          {' › '}
          <span>{cityConfig.name}</span>
        </nav>
        <h1 className="text-3xl font-bold mb-1">{c.name} Deals in {cityConfig.name}</h1>
        <p className="text-gray-600 text-sm mb-6">
          {locCount.toLocaleString()} {c.name} location{locCount === 1 ? '' : 's'} in {cityConfig.display} ·{' '}
          {deals.length} active deal{deals.length === 1 ? '' : 's'}
        </p>

        <ul className="space-y-3">
          {deals.map(d => {
            const bucket = confidenceBucket(d.confidence_score);
            return (
              <li key={d.deal_id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                      {DEAL_TYPE_LABELS[d.deal_type] || d.deal_type}
                    </div>
                    <h2 className="text-lg font-semibold">{d.title}</h2>
                    <p className="text-sm text-gray-600 mt-1">{d.description}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded border whitespace-nowrap ${
                    bucket === 'verified' ? 'bg-green-50 text-green-700 border-green-200' :
                    bucket === 'likely' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    'bg-gray-50 text-gray-600 border-gray-200'
                  }`}>
                    {bucket === 'verified' ? '✓ Verified' : bucket === 'likely' ? '~ Likely' : '? Unverified'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                  {d.recurrence && <span>↻ {d.recurrence}</span>}
                  {d.last_verified_at && <span>checked {freshnessLabel(d.last_verified_at)}</span>}
                  <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                     className="ml-auto text-blue-600 hover:underline font-medium">
                    Get deal →
                  </a>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 text-sm text-gray-600">
          See all{' '}
          <Link href={`/deals/${city}`} className="text-blue-600 hover:underline">free food deals in {cityConfig.name}</Link>
          {' '}or browse all{' '}
          <Link href={`/chains/${c.slug}`} className="text-blue-600 hover:underline">{c.name} deals nationwide</Link>.
        </div>
      </main>
    </>
  );
}
