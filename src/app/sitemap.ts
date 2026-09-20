import type { MetadataRoute } from 'next';
import { getVisibleServices } from '@/lib/services/registry';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';
  const lastModified = new Date();

  // Core static public pages
  const corePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/services`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/track`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/support`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/refunds`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/payment-policy`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/service-terms`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];

  // Dynamically map active service categories from the registry
  // This guarantees hidden services (electricity, TV, water) never appear in the sitemap.
  const visibleServices = getVisibleServices();
  const uniqueServiceHrefs = Array.from(
    new Set(visibleServices.map((s) => s.href))
  );

  const servicePages: MetadataRoute.Sitemap = uniqueServiceHrefs.map((href) => ({
    url: `${baseUrl}${href}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.95,
  }));

  // Merge, ensuring no duplicate URLs
  const sitemapUrls = new Map<string, MetadataRoute.Sitemap[number]>();
  
  [...corePages, ...servicePages].forEach((entry) => {
    sitemapUrls.set(entry.url, entry);
  });

  return Array.from(sitemapUrls.values());
}
