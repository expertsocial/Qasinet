import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QasiNet - Digital Services & Telecom',
    short_name: 'QasiNet',
    description: 'Instant Airtime & High-speed Data Bundles in Kenya',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0a0a0a',
    theme_color: '#10b981',
    categories: ['utilities', 'finance', 'shopping'],
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
    shortcuts: [
      {
        name: 'Buy Data Bundles',
        short_name: 'Bundles',
        description: 'Browse & buy discounted Safaricom, Airtel, and Faiba data bundles',
        url: '/services/data',
        icons: [{ src: '/icon.jpeg', sizes: '192x192' }],
      },
      {
        name: 'Buy Airtime',
        short_name: 'Airtime',
        description: 'Top up Safaricom, Airtel, Telkom, or Equitel airtime',
        url: '/services/airtime',
        icons: [{ src: '/icon.jpeg', sizes: '192x192' }],
      },
    ],
  };
}
