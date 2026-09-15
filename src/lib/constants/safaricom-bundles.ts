export interface SafaricomBundle {
  name: string;
  code: string;
  price: number;
  validity: string;
  allowance: string;
  badge?: string;
  popular?: boolean;
  category: 'daily' | 'weekly' | 'monthly' | 'voice_combo';
  description?: string;
}

export const SAFARICOM_BUNDLE_CODES = [
  '1.25GB',
  '2GB',
  '1GB_30MINS',
  '14GB',
  '45MINS',
  '600MB',
  '1GB_1HR',
  '500MB',
  '2.5GB',
  '3GB',
  '5GB',
  '20GB',
] as const;

export type SafaricomBundleCode = typeof SAFARICOM_BUNDLE_CODES[number];

export const SAFARICOM_DATA_BUNDLES: SafaricomBundle[] = [
  {
    name: '1.25 GB Super Deal',
    code: '1.25GB',
    price: 51,
    validity: 'Midnight',
    allowance: '1.25 GB',
    badge: '🔥 Popular',
    popular: true,
    category: 'daily',
    description: '1.25 GB valid until midnight. Works with Okoa Jahazi debt.'
  },
  {
    name: '2 GB Midnight Saver',
    code: '2GB',
    price: 41,
    validity: 'Midnight',
    allowance: '2 GB',
    badge: '⚡ Best Deal',
    popular: true,
    category: 'daily',
    description: 'High-speed 2 GB valid until midnight.'
  },
  {
    name: '1 GB + 30 Mins Combo',
    code: '1GB_30MINS',
    price: 40,
    validity: 'Midnight',
    allowance: '1 GB + 30 Mins',
    badge: '📞 Voice + Data',
    popular: true,
    category: 'voice_combo',
    description: '1 GB data plus 30 all-network minutes + free WhatsApp until midnight.'
  },
  {
    name: '14 GB Big Saver',
    code: '14GB',
    price: 199,
    validity: '7 Days',
    allowance: '14 GB',
    badge: '📦 Big Saver',
    popular: true,
    category: 'weekly',
    description: 'Massive 14 GB for heavy browsing and streaming valid for a full week.'
  },
  {
    name: '45 Mins Calls',
    code: '45MINS',
    price: 19,
    validity: '3 Hours',
    allowance: '45 Mins',
    badge: '📞 Best Value',
    category: 'voice_combo',
    description: '45 minutes to any network in Kenya valid for 3 hours.'
  },
  {
    name: '600 MB Weekly',
    code: '600MB',
    price: 39,
    validity: '7 Days',
    allowance: '600 MB',
    category: 'weekly',
    description: 'Reliable weekly data for messaging and browsing.'
  },
  {
    name: '1 GB Flash Deal',
    code: '1GB_1HR',
    price: 15,
    validity: '1 Hour',
    allowance: '1 GB',
    badge: '⚡ Flash',
    category: 'daily',
    description: '1 GB high-speed burst valid for 1 hour.'
  },
  {
    name: '500 MB Daily',
    code: '500MB',
    price: 21,
    validity: '24 Hours',
    allowance: '500 MB',
    category: 'daily',
    description: 'Standard 24-hour connectivity bundle.'
  },
  {
    name: '2.5 GB Daily',
    code: '2.5GB',
    price: 80,
    validity: '24 Hours',
    allowance: '2.5 GB',
    category: 'daily',
    description: '2.5 GB high-capacity daily bundle.'
  },
  {
    name: '3 GB Weekly',
    code: '3GB',
    price: 99,
    validity: '7 Days',
    allowance: '3 GB',
    category: 'weekly',
    description: '3 GB valid for 7 days.'
  },
  {
    name: '5 GB Weekly',
    code: '5GB',
    price: 149,
    validity: '7 Days',
    allowance: '5 GB',
    category: 'weekly',
    description: '5 GB valid for 7 days.'
  },
  {
    name: '20 GB Monthly Mega',
    code: '20GB',
    price: 499,
    validity: '30 Days',
    allowance: '20 GB',
    badge: '🚀 Monthly Mega',
    category: 'monthly',
    description: '20 GB monthly high-speed internet.'
  }
];
