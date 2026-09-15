export interface AirtelBundle {
  name: string;
  code: string;
  price: number;
  validity: string;
  allowance: string;
  badge?: string;
  popular?: boolean;
  category: 'daily' | 'weekly' | 'monthly';
  description?: string;
}

export const AIRTEL_BUNDLE_CODES = [
  'AIR_2GB',
  'AIR_1GB_24H',
  'AIR_3GB_24H',
  'AIR_6GB_7D',
  'AIR_15GB_30D',
] as const;

export type AirtelBundleCode = typeof AIRTEL_BUNDLE_CODES[number];

export const AIRTEL_DATA_BUNDLES: AirtelBundle[] = [
  {
    name: '2 GB Midnight Deal',
    code: 'AIR_2GB',
    price: 41,
    validity: 'Midnight',
    allowance: '2 GB',
    badge: '⚡ Best Deal',
    popular: true,
    category: 'daily',
    description: 'High-speed 2 GB valid until midnight on Airtel.'
  },
  {
    name: '1 GB Daily Pack',
    code: 'AIR_1GB_24H',
    price: 25,
    validity: '24 Hours',
    allowance: '1 GB',
    popular: true,
    category: 'daily',
    description: '1 GB data valid for 24 hours.'
  },
  {
    name: '3 GB Daily Boost',
    code: 'AIR_3GB_24H',
    price: 60,
    validity: '24 Hours',
    allowance: '3 GB',
    category: 'daily',
    description: '3 GB valid for 24 hours for heavy downloading.'
  },
  {
    name: '6 GB Weekly',
    code: 'AIR_6GB_7D',
    price: 150,
    validity: '7 Days',
    allowance: '6 GB',
    badge: '📦 Value Pack',
    category: 'weekly',
    description: '6 GB valid for 7 days.'
  },
  {
    name: '15 GB Monthly',
    code: 'AIR_15GB_30D',
    price: 399,
    validity: '30 Days',
    allowance: '15 GB',
    badge: '🚀 Big Saver',
    category: 'monthly',
    description: '15 GB monthly data plan.'
  }
];
