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
      <main className="min-h-screen bg-[#FAF7F2]">
        <header className="border-b border-stone-100">
          <div className="max-w-3xl mx-auto px-5 py-4">
            <nav className="text-xs text-stone-400 flex items-center gap-1.5">
              <Link href="/" className="hover:text-stone-700 transition-colors">FreebieMe</Link>
              <span className="text-stone-300">›</span>
              <Link href="/chains" className="hover:text-stone-700 transition-colors">Chains</Link>
              <span className="text-stone-300">›</span>
              <span className="text-stone-700 font-medium">{c.name}</span>
            </nav>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-5 py-10">
          <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight mb-2">
            {c.name}
          </h1>
          <p className="text-stone-500 text-sm mb-8">
            {deals.length} offer{deals.length === 1 ? '' : 's'} · {locationCount.toLocaleString()} locations · {c.cuisine.join(', ')}
          </p>

          <ul className="space-y-3">
            {deals.map(d => {
              const bucket = confidenceBucket(d.confidence_score);
              const trustDot =
                bucket === 'verified' ? 'bg-emerald-500' : bucket === 'likely' ? 'bg-amber-400' : 'bg-stone-300';
              return (
                <li key={d.deal_id} className="bg-white border border-stone-100 rounded-2xl p-6 hover:border-stone-200 transition-colors">
                  <div className="text-[11px] font-medium text-stone-400 uppercase tracking-[0.16em] mb-3">
                    {DEAL_TYPE_LABELS[d.deal_type] || d.deal_type}
                  </div>
                  <h2 className="text-xl font-semibold text-stone-900 tracking-tight leading-snug mb-1">
                    {d.title}
                  </h2>
                  {d.description && d.description !== d.title && (
                    <p className="text-sm text-stone-500 mt-1 leading-relaxed">{d.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4">
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                    >
                      Get it →
                    </a>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 flex-1 min-w-0">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${trustDot}`} />
                        {bucket === 'verified' ? 'Verified' : bucket === 'likely' ? 'Likely' : 'Unverified'}
                      </span>
                      {d.last_verified_at && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span>checked {freshnessLabel(d.last_verified_at)}</span>
                        </>
                      )}
                      {d.recurrence && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span>{d.recurrence}</span>
                        </>
                      )}
                      {d.valid_until && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-orange-600 font-medium">
                            ends {new Date(d.valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </main>
    </>
  );
}
