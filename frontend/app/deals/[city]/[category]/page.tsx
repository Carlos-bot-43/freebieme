import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getCities, getAvailableCities } from '../../../../lib/data';
import { distanceMiles } from '../../../../lib/types';
import { FOOD_CATEGORY_LABELS } from '../../../../lib/foodCategories';
import CityDealsClient from '../CityDealsClient';

interface PageProps {
  params: Promise<{ city: string; category: string }>;
}

export const dynamicParams = false;

const SEO_CATEGORIES = ['burgers', 'pizza', 'chicken', 'tacos', 'breakfast', 'coffee', 'ice-cream', 'sandwiches', 'wings'];

export async function generateStaticParams() {
  const cities = getAvailableCities();
  return cities.flatMap((city) =>
    SEO_CATEGORIES.map((category) => ({ city, category }))
  );
}

// Map chains known to have deals in each category (for meta descriptions)
const CATEGORY_CHAINS: Record<string, string[]> = {
  'burgers': ["McDonald's", 'Burger King', 'Wendy\'s', 'Shake Shack'],
  'pizza': ['Domino\'s', 'Pizza Hut', 'Papa John\'s'],
  'chicken': ['Chick-fil-A', 'KFC', 'Popeyes', 'Raising Cane\'s', 'Wingstop'],
  'tacos': ['Chipotle', 'Taco Bell', 'Del Taco', 'Jack in the Box'],
  'breakfast': ['Dunkin\'', 'IHOP', 'Denny\'s', 'Waffle House', 'Panera'],
  'coffee': ['Starbucks', 'Dunkin\'', 'Panera'],
  'ice-cream': ['Dairy Queen', 'Baskin-Robbins', 'Cold Stone Creamery'],
  'sandwiches': ['Subway', 'Jersey Mike\'s', 'Panera', 'Jimmy John\'s'],
  'wings': ['Wingstop', 'Buffalo Wild Wings', 'Pizza Hut'],
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, category } = await params;
  const cities = getCities();
  const cityConfig = cities.find((c) => c.slug === city);

  if (!cityConfig || !SEO_CATEGORIES.includes(category)) {
    return { title: 'Not Found - FreebieMe' };
  }

  const categoryLabel = (FOOD_CATEGORY_LABELS[category] || category).replace(/^[^\w]*/, '').trim();
  const chains = CATEGORY_CHAINS[category] || [];
  const chainStr = chains.slice(0, 3).join(', ');

  return {
    title: `Best ${categoryLabel} Deals in ${cityConfig.name} | FreebieMe`,
    description: `Find free and discounted ${categoryLabel.toLowerCase()} near you in ${cityConfig.name}. Birthday freebies, app deals and rewards at ${chainStr} and more in ${cityConfig.display}.`,
    openGraph: {
      title: `${categoryLabel} Deals in ${cityConfig.name} | FreebieMe`,
      description: `Free ${categoryLabel.toLowerCase()} deals at ${chainStr} and more near ${cityConfig.name}.`,
    },
    twitter: {
      card: 'summary',
      title: `Free ${categoryLabel} in ${cityConfig.name} | FreebieMe`,
      description: `Birthday freebies & app deals for ${categoryLabel.toLowerCase()} near ${cityConfig.name}.`,
    },
    alternates: {
      canonical: `https://freebieme.vercel.app/deals/${city}/${category}`,
    },
  };
}

export default async function CategoryDealsPage({ params }: PageProps) {
  const { city, category } = await params;
  const cities = getCities();
  const cityConfig = cities.find((c) => c.slug === city);

  if (!cityConfig || !SEO_CATEGORIES.includes(category)) {
    notFound();
  }

  const available = new Set(getAvailableCities());
  const availableCities = cities.filter((c) => available.has(c.slug));

  // Compute nearby cities
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

  const categoryLabel = (FOOD_CATEGORY_LABELS[category] || category).replace(/^[^\w\s]*\s*/, '').trim();
  const chains = CATEGORY_CHAINS[category] || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Best ${categoryLabel} Deals in ${cityConfig.display}`,
    description: `Find free and discounted ${categoryLabel.toLowerCase()} at restaurant chains in ${cityConfig.display}.`,
    url: `https://freebieme.vercel.app/deals/${cityConfig.slug}/${category}`,
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'FreebieMe', item: 'https://freebieme.vercel.app' },
        { '@type': 'ListItem', position: 2, name: `Deals in ${cityConfig.name}`, item: `https://freebieme.vercel.app/deals/${cityConfig.slug}` },
        { '@type': 'ListItem', position: 3, name: `${categoryLabel} Deals`, item: `https://freebieme.vercel.app/deals/${cityConfig.slug}/${category}` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 3C: The visible h1 rendered by CityDealsClient is sufficient; no sr-only duplication needed */}
      <CityDealsClient
        cityConfig={cityConfig}
        allCities={availableCities}
        nearbyCities={nearbyCities}
        defaultFoodCategory={category}
      />
    </>
  );
}
