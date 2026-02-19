import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCities, getAvailableCities, getCityDealCount } from '../../../lib/data';
import { distanceMiles } from '../../../lib/types';
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

  const dealCount = getCityDealCount(city);
  const countStr = dealCount > 0 ? `${dealCount.toLocaleString()} ` : '';

  return {
    title: `${countStr}Free Food Deals in ${cityConfig.name} | FreebieMe`,
    description: `Find ${countStr}birthday freebies, app deals, and sign-up bonuses at restaurants in ${cityConfig.display}. Sorted by distance. Always free to use.`,
    openGraph: {
      title: `Free Food Deals in ${cityConfig.name}`,
      description: `${countStr}birthday freebies, app deals & sign-up bonuses near ${cityConfig.name}.`,
    },
    twitter: {
      card: 'summary',
      title: `Free Food in ${cityConfig.name} | FreebieMe`,
      description: `${countStr}restaurant freebies & deals near ${cityConfig.name}.`,
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

  // Compute nearby cities (closest 4, excluding current)
  const nearbyCities = [...availableCities]
    .filter((c) => c.slug !== cityConfig.slug)
    .map((c) => ({
      ...c,
      distFromCurrent: distanceMiles(
        cityConfig.center.lat, cityConfig.center.lng,
        c.center.lat, c.center.lng
      ),
    }))
    .sort((a, b) => a.distFromCurrent - b.distFromCurrent)
    .slice(0, 4);

  return <CityDealsClient cityConfig={cityConfig} allCities={availableCities} nearbyCities={nearbyCities} />;
}
