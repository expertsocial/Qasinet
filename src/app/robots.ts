import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://qasinet.com';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/dashboard/',
          '/auth/',
          '/receipt/',
          '/services/electricity',
          '/services/tv',
          '/services/water',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
