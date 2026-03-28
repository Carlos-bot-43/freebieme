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
          text: `FreebieMe tracks birthday freebies, app deals, and sign-up bonuses at 41+ restaurant chains in ${cityConfig.display}, including McDonald's, Chipotle, Starbucks, Chick-fil-A, Buffalo Wild Wings, Firehouse Subs, Little Caesars, and more.`,
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
          text: `Restaurants offering birthday freebies in ${cityConfig.name} include Starbucks (free drink), Chipotle (free entrée), Dairy Queen (free Blizzard), IHOP (free pancakes), Denny's (free Grand Slam), Baskin-Robbins (free scoop), Firehouse Subs (free medium sub), Wingstop (free 6 wings), Buffalo Wild Wings (free appetizer), and more.`,
        },
      },
      {
        '@type': 'Question',
        name: `Does Buffalo Wild Wings have a birthday freebie in ${cityConfig.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes — Buffalo Wild Wings Blazin' Rewards members get a free appetizer or dessert during their birthday month at participating locations in ${cityConfig.name}. Sign up for the BWW app to activate.`,
        },
      },
      {
        '@type': 'Question',
        name: `Does Firehouse Subs have a birthday freebie in ${cityConfig.name}?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes — Firehouse Rewards members get a free medium sub on their birthday at Firehouse Subs locations in ${cityConfig.name}. Sign up at firehousesubs.com/rewards at least 7 days before your birthday.`,
        },
      },
    ],
  };

  // Restaurant + Offer ItemList schema for rich results
  // Helps Google surface "Chick-fil-A birthday freebie near me" type queries
  const restaurantOffersSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Free Food Deals at Restaurants in ${cityConfig.display}`,
    description: `Birthday freebies, signup bonuses, and app deals at restaurants in ${cityConfig.display}`,
    url: `https://freebieme.vercel.app/deals/${cityConfig.slug}`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        item: {
          '@type': 'FoodEstablishment',
          name: "McDonald's",
          servesCuisine: 'American, Fast Food',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: "McDonald's Free Food Deals",
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Free Birthday Reward',
                description: "MyMcDonald's Rewards members get a free birthday reward during their birthday month.",
                url: 'https://www.mcdonalds.com/us/en-us/mymcdonalds-rewards.html',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
      {
        '@type': 'ListItem',
        position: 2,
        item: {
          '@type': 'FoodEstablishment',
          name: 'Chick-fil-A',
          servesCuisine: 'American, Chicken, Fast Food',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Chick-fil-A Free Food Deals',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Chick-fil-A One Birthday Reward',
                description: 'Chick-fil-A One members receive a free reward item on their birthday.',
                url: 'https://www.chick-fil-a.com/one',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
      {
        '@type': 'ListItem',
        position: 3,
        item: {
          '@type': 'FoodEstablishment',
          name: 'Starbucks',
          servesCuisine: 'Coffee, Cafe',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Starbucks Free Food Deals',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Free Birthday Drink',
                description: 'Starbucks Rewards members get a free drink or food item on their birthday.',
                url: 'https://www.starbucks.com/rewards',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
      {
        '@type': 'ListItem',
        position: 4,
        item: {
          '@type': 'FoodEstablishment',
          name: 'Buffalo Wild Wings',
          servesCuisine: 'American, Wings, Sports Bar',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Buffalo Wild Wings Free Food Deals',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Free Birthday Appetizer',
                description: "Blazin' Rewards members get a free appetizer or dessert during their birthday month.",
                url: 'https://www.buffalowildwings.com/rewards',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
      {
        '@type': 'ListItem',
        position: 5,
        item: {
          '@type': 'FoodEstablishment',
          name: 'Firehouse Subs',
          servesCuisine: 'Subs, Sandwiches',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Firehouse Subs Free Food Deals',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Free Birthday Medium Sub',
                description: 'Firehouse Rewards members get a free medium sub on their birthday.',
                url: 'https://www.firehousesubs.com/rewards',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
      {
        '@type': 'ListItem',
        position: 6,
        item: {
          '@type': 'FoodEstablishment',
          name: 'Chipotle Mexican Grill',
          servesCuisine: 'Mexican, Fast Casual',
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: 'Chipotle Free Food Deals',
            itemListElement: [
              {
                '@type': 'Offer',
                name: 'Free Birthday Entrée',
                description: 'Chipotle Rewards members get a free entrée during their birthday month.',
                url: 'https://www.chipotle.com/rewards',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                eligibleCustomerType: 'https://schema.org/RewardCustomer',
              },
            ],
          },
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantOffersSchema) }} />
      <CityDealsClient cityConfig={cityConfig} allCities={availableCities} nearbyCities={nearbyCities} />
    </>
  );
}
