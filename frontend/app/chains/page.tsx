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
    <main className="min-h-screen bg-[#FAF7F2]">
      <header className="border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-base font-semibold text-stone-900 tracking-tight hover:text-stone-600 transition-colors"
          >
            FreebieMe
          </Link>
          <span className="text-stone-300">›</span>
          <span className="text-sm text-stone-600 font-medium">Chains</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-10">
        <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 tracking-tight mb-2">
          All chains
        </h1>
        <p className="text-stone-500 text-sm mb-8">
          {enriched.length} chains tracked · {enriched.reduce((s, c) => s + c.dealCount, 0)} unique deals
        </p>
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {enriched.map(c => (
            <li key={c.slug}>
              <Link
                href={`/chains/${c.slug}`}
                className="block p-5 bg-white rounded-2xl border border-stone-100 hover:border-stone-200 transition-colors"
              >
                <div className="text-[11px] font-semibold text-stone-900 uppercase tracking-[0.16em] mb-2">
                  {c.name}
                </div>
                <div className="text-xs text-stone-400">
                  {c.dealCount} deal{c.dealCount === 1 ? '' : 's'} · {c.locationCount} locations
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
