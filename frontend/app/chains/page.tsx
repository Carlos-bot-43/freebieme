import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllChains, getDealsForChain, getLocationCountForChain } from '../../lib/normalized-data';

export const metadata: Metadata = {
  title: 'All Restaurant Chains with Free Food Deals | FreebieMe',
  description: 'Browse every restaurant chain we track — birthday freebies, signup bonuses, app deals, rewards programs.',
  alternates: { canonical: 'https://freebieme.vercel.app/chains' },
};

export default function ChainsIndex() {
  const chains = getAllChains();
  const enriched = chains
    .map(c => ({
      ...c,
      dealCount: getDealsForChain(c.slug).length,
      locationCount: getLocationCountForChain(c.slug),
    }))
    .filter(c => c.dealCount > 0)
    .sort((a, b) => b.locationCount - a.locationCount);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">All Restaurant Chains</h1>
      <p className="text-gray-600 mb-6">
        {enriched.length} chains tracked, {enriched.reduce((s, c) => s + c.dealCount, 0)} unique deals.
      </p>
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {enriched.map(c => (
          <li key={c.slug}>
            <Link
              href={`/chains/${c.slug}`}
              className="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="font-semibold">{c.name}</div>
              <div className="text-xs text-gray-500 mt-1">
                {c.dealCount} deal{c.dealCount === 1 ? '' : 's'} · {c.locationCount} locations
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
