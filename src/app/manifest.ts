import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QasiNet - Digital Services & Utilities',
    short_name: 'QasiNet',
    description: 'Instant Airtime, High-speed Data Bundles, Electricity & Utility Payments in Kenya',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#10b981',
    icons: [
      {
        src: '/icon.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/icon.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  };
}
