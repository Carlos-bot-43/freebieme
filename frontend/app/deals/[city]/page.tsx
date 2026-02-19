import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCities, getCityDeals, getAvailableCities } from '../../../lib/data';
import CityDealsClient from './CityDealsClient';

interface PageProps {
  params: Promise<{ city: string }>;
}

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

export default async function CityDealsPage({ params }: PageProps) {
  const { city } = await params;
  const cities = getCities();
  const cityConfig = cities.find((c) => c.slug === city);
  const cityDeals = getCityDeals(city);

  if (!cityConfig || !cityDeals) {
    notFound();
  }

  return (
    <CityDealsClient
      cityConfig={cityConfig}
      cityDeals={cityDeals}
      allCities={cities}
    />
  );
}
