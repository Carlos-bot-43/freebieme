import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCities, getAvailableCities } from '../../../lib/data';
import CityDealsClient from './CityDealsClient';

interface PageProps {
  params: Promise<{ city: string }>;
}

// Only pre-generate the 25 known city slugs. No ISR fallback.
export const dynamicParams = false;

export async function generateStaticParams() {
  const available = getAvailableCities();
  return available.map((city) => ({ city }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const cities = getCities();
  const cityConfig = cities.find((c) => c.slug === city);

  if (!cityConfig) {
    return { title: 'City Not Found - FreebieMe' };
  }

  return {
    title: `Free Food Deals in ${cityConfig.name} | FreebieMe`,
    description: `Find birthday freebies, app deals, and sign-up bonuses at restaurants in ${cityConfig.display}. Updated daily.`,
    openGraph: {
      title: `Free Food Deals in ${cityConfig.name}`,
      description: `Birthday freebies, app deals & more at restaurants near ${cityConfig.name}.`,
    },
  };
}

// Server component only handles metadata + city config (tiny).
// Deal data is fetched client-side from /data/deals/[city].json
// This prevents the 241MB data files from being bundled into serverless functions.
export default async function CityDealsPage({ params }: PageProps) {
  const { city } = await params;
  const cities = getCities();
  const cityConfig = cities.find((c) => c.slug === city);

  if (!cityConfig) {
    notFound();
  }

  // Only pass cities that have deal files (so the dropdown doesn't show broken links)
  const available = new Set(getAvailableCities());
  const availableCities = cities.filter((c) => available.has(c.slug));

  return <CityDealsClient cityConfig={cityConfig} allCities={availableCities} />;
}
