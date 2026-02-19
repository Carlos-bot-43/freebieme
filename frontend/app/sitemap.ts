import { MetadataRoute } from 'next';
import { getAvailableCities } from '../lib/data';

const SEO_CATEGORIES = ['burgers', 'pizza', 'chicken', 'tacos', 'breakfast', 'coffee', 'ice-cream', 'sandwiches', 'wings', 'casual-dining'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://freebieme.vercel.app';
  const cities = getAvailableCities();

  const cityUrls = cities.map((slug) => ({
    url: `${baseUrl}/deals/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  const categoryUrls = cities.flatMap((slug) =>
    SEO_CATEGORIES.map((category) => ({
      url: `${baseUrl}/deals/${slug}/${category}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  );

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...cityUrls,
    ...categoryUrls,
  ];
}
