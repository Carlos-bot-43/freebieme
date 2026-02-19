import { MetadataRoute } from 'next';
import { getAvailableCities } from '../lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://freebieme.vercel.app';
  const cities = getAvailableCities();

  const cityUrls = cities.map((slug) => ({
    url: `${baseUrl}/deals/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    ...cityUrls,
  ];
}
