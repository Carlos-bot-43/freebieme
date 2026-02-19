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
    alternates: {
      canonical: `https://freebieme.vercel.app/deals/${city}`,
    },
    openGraph: {
      title: `Free Food Deals in ${cityConfig.name}`,
      description: `${countStr}birthday freebies, app deals & sign-up bonuses near ${cityConfig.name}.`,
      images: [{ url: `https://freebieme.vercel.app/deals/${city}/opengraph-image` }],
    },
    twitter: {
      card: 'summary_large_image',
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

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Free Food Deals in ${cityConfig.display}`,
    description: `Find birthday freebies, app deals, and sign-up bonuses at restaurants in ${cityConfig.display}.`,
    url: `https://freebieme.vercel.app/deals/${cityConfig.slug}`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'FreebieMe', item: 'https://freebieme.vercel.app' },
        { '@type': 'ListItem', position: 2, name: `Deals in ${cityConfig.name}`, item: `https://freebieme.vercel.app/deals/${cityConfig.slug}` },
      ],
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What free food deals are available in ${cityConfig.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `FreebieMe tracks birthday freebies, app deals, and sign-up bonuses at 34+ restaurant chains in ${cityConfig.display}, including McDonald's, Chipotle, Starbucks, Chick-fil-A, and more.`,
        },
      },
      {
        '@type': 'Question',
        name: `How do I get free food in ${cityConfig.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `The easiest way to get free food in ${cityConfig.name} is to sign up for restaurant rewards apps. Chains like Chipotle, McDonald's, and Starbucks offer free items just for joining. Birthday freebies are also available at over 20 chains — no purchase required at most locations.`,
        },
      },
      {
        '@type': 'Question',
        name: `What restaurants offer birthday freebies in ${cityConfig.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Restaurants offering birthday freebies in ${cityConfig.name} include Starbucks (free drink), Chipotle (free entrée), Dairy Queen (free Blizzard), IHOP (free pancakes), Denny's (free Grand Slam), Baskin-Robbins (free scoop), and more.`,
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CityDealsClient cityConfig={cityConfig} allCities={availableCities} nearbyCities={nearbyCities} />
    </>
  );
}
