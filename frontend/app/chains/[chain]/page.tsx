import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
  getAllChains,
  getChain,
  getDealsForChain,
  getLocationCountForChain,
} from '../../../lib/normalized-data';
import { DEAL_TYPE_LABELS } from '../../../lib/types';
import { confidenceBucket, freshnessLabel } from '../../../lib/normalized-types';

interface PageProps {
  params: Promise<{ chain: string }>;
}

export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllChains().map(c => ({ chain: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { chain } = await params;
  const c = getChain(chain);
  if (!c) return { title: 'Chain Not Found - FreebieMe' };
  const dealCount = getDealsForChain(chain).length;
  return {
    title: `${c.name} Free Food Deals — Birthday, Signup & App Offers | FreebieMe`,
    description: `Every active ${c.name} freebie and deal — ${dealCount} offers verified and tracked daily.`,
    alternates: { canonical: `https://freebieme.vercel.app/chains/${c.slug}` },
  };
}

export default async function ChainPage({ params }: PageProps) {
  const { chain } = await params;
  const c = getChain(chain);
  if (!c) notFound();

  const deals = getDealsForChain(chain).sort((a, b) => b.confidence_score - a.confidence_score);
  const locationCount = getLocationCountForChain(chain);

  // schema.org Offer JSON-LD: one per unique deal — Google can render each as a rich result.
  const offers = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${c.name} Free Food Deals`,
    itemListElement: deals.map((d, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Offer',
        name: d.title,
        description: d.description,
        url: d.source_url,
        price: '0',
        priceCurrency: 'USD',
        availability: d.valid_until ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock',
        validFrom: d.valid_from || d.first_seen_at,
        validThrough: d.valid_until || undefined,
        eligibleCustomerType: 'https://schema.org/RewardCustomer',
        seller: {
          '@type': 'FoodEstablishment',
          name: c.name,
          servesCuisine: c.cuisine.join(', '),
          url: c.rewards_url,
        },
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'FreebieMe', item: 'https://freebieme.vercel.app' },
      { '@type': 'ListItem', position: 2, name: 'Chains', item: 'https://freebieme.vercel.app/chains' },
      { '@type': 'ListItem', position: 3, name: c.name, item: `https://freebieme.vercel.app/chains/${c.slug}` },
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
          <span>{c.name}</span>
        </nav>
        <h1 className="text-3xl font-bold mb-1">{c.name} Free Food Deals</h1>
        <p className="text-gray-600 mb-6 text-sm">
          {deals.length} offer{deals.length === 1 ? '' : 's'} · {locationCount.toLocaleString()} tracked locations · {c.cuisine.join(', ')}
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
                  {d.valid_until && (
                    <span className="text-orange-600 font-medium">
                      expires {new Date(d.valid_until).toLocaleDateString()}
                    </span>
                  )}
                  <a href={d.source_url} target="_blank" rel="noopener noreferrer"
                     className="ml-auto text-blue-600 hover:underline font-medium">
                    Get deal →
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
