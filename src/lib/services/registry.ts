/**
 * Unified QasiNet Service Registry
 * 
 * Provides centralized configuration for all customer-facing services.
 * Each service has one of three availability states:
 * - 'enabled': Shown and fully accessible for live transactions.
 * - 'coming_soon': Visually presented with a "Coming Soon" badge and explanation, disabled from checkout.
 * - 'hidden': Completely suppressed from homepage, navigation, and service listings.
 */

export type ServiceStatus = 'enabled' | 'coming_soon' | 'hidden';

export type ServiceCategory = 'airtime' | 'data' | 'electricity' | 'tv' | 'water';

export type ServiceGroupKey = 'airtime_data' | 'bill_payments';

export interface ServiceDefinition {
  id: string;
  title: string;
  shortName: string;
  category: ServiceCategory;
  categoryLabel: string;
  groupKey: ServiceGroupKey;
  groupTitle: string;
  logoSrc: string;
  badge: string;
  tagline: string;
  description: string;
  href: string;
  defaultStatus: ServiceStatus;
  comingSoonMessage?: string;
}

export interface ServiceGroup {
  key: ServiceGroupKey;
  title: string;
  tagline: string;
  iconName: 'Smartphone' | 'Zap';
  services: (ServiceDefinition & { status: ServiceStatus })[];
}

export interface ServiceCategoryNav {
  id: ServiceCategory;
  name: string;
  desc: string;
  href: string;
  iconName: 'Smartphone' | 'Wifi' | 'Zap' | 'Tv' | 'Droplets';
  badge: string;
  status: ServiceStatus;
}

// Master list of all registered services on QasiNet
export const MASTER_SERVICES: ServiceDefinition[] = [
  // --- Mobile Airtime ---
  {
    id: 'safaricom-airtime',
    title: 'Safaricom Airtime',
    shortName: 'Safaricom',
    category: 'airtime',
    categoryLabel: 'Airtime',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/safaricom-logo.png',
    badge: '0% Fee',
    tagline: 'Instant Top-Up',
    description: 'Instantly top up Safaricom airtime for yourself or someone else with automated M-Pesa fulfillment.',
    href: '/services/airtime?provider=safaricom',
    defaultStatus: 'enabled',
  },
  {
    id: 'airtel-airtime',
    title: 'Airtel Airtime',
    shortName: 'Airtel',
    category: 'airtime',
    categoryLabel: 'Airtime',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/airtel-logo.jpg',
    badge: '0% Fee',
    tagline: 'Instant Top-Up',
    description: 'Recharge Airtel lines across Kenya with zero transaction fees and immediate confirmation.',
    href: '/services/airtime?provider=airtel',
    defaultStatus: 'enabled',
  },
  {
    id: 'telkom-airtime',
    title: 'Telkom Airtime',
    shortName: 'Telkom',
    category: 'airtime',
    categoryLabel: 'Airtime',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/telcom-logo.png',
    badge: '0% Fee',
    tagline: 'Instant Top-Up',
    description: 'Buy Telkom airtime anytime, anywhere securely on QasiNet with automated delivery.',
    href: '/services/airtime?provider=telkom',
    defaultStatus: 'enabled',
  },
  {
    id: 'faiba-airtime',
    title: 'Faiba 4G Airtime',
    shortName: 'Faiba Airtime',
    category: 'airtime',
    categoryLabel: 'Airtime',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/faiba-logo.png',
    badge: '0% Fee',
    tagline: 'Pinless Top-Up',
    description: 'Get Faiba JTL pinless airtime top-up credited in seconds to any 0747 line.',
    href: '/services/airtime?provider=faiba',
    defaultStatus: 'enabled',
  },
  {
    id: 'equitel-airtime',
    title: 'Equitel Airtime',
    shortName: 'Equitel',
    category: 'airtime',
    categoryLabel: 'Airtime',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/equitel-logo.jpg',
    badge: '0% Fee',
    tagline: 'Instant Top-Up',
    description: 'Purchase Equitel line credit with zero delays and automatic network delivery.',
    href: '/services/airtime?provider=equitel',
    defaultStatus: 'enabled',
  },

  // --- Mobile Data ---
  {
    id: 'faiba-data',
    title: 'Faiba 4G Data Packages',
    shortName: 'Faiba Bundles',
    category: 'data',
    categoryLabel: 'Data Bundles',
    groupKey: 'airtime_data',
    groupTitle: 'Mobile Airtime & Internet Data',
    logoSrc: '/logos/faiba-logo.png',
    badge: '19 Packages',
    tagline: 'High-Speed 4G+ Data',
    description: 'Daily, weekly, and monthly 4G data packages for Faiba lines. Non-Faiba bundles coming soon.',
    href: '/services/data',
    defaultStatus: 'coming_soon',
    comingSoonMessage: 'Faiba data bundles are undergoing scheduled maintenance. Please purchase pinless Faiba Airtime instead.',
  },

  // --- Electricity ---
  {
    id: 'kplc-prepaid',
    title: 'KPLC Prepaid Tokens',
    shortName: 'KPLC Prepaid',
    category: 'electricity',
    categoryLabel: 'Electricity',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/kenya-power-logo.jpg',
    badge: '24/7 Vend',
    tagline: 'Instant Meter Token',
    description: 'Buy KPLC electricity tokens with automatic meter owner detection and instant 20-digit token SMS.',
    href: '/services/electricity',
    defaultStatus: 'enabled',
  },
  {
    id: 'kplc-postpaid',
    title: 'KPLC Postpaid Bill',
    shortName: 'KPLC Postpaid',
    category: 'electricity',
    categoryLabel: 'Electricity',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/kenya-power-logo.jpg',
    badge: 'Verified',
    tagline: 'Direct Bill Pay',
    description: 'Pay postpaid electricity accounts with live balance inquiry and immediate clearance.',
    href: '/services/electricity',
    defaultStatus: 'enabled',
  },

  // --- Water ---
  {
    id: 'nairobi-water',
    title: 'Nairobi Water Utility',
    shortName: 'Nairobi Water',
    category: 'water',
    categoryLabel: 'Water Utility',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/water-service-logo.jpg',
    badge: 'Auto Detect',
    tagline: 'Direct Bill Settle',
    description: 'Settle municipal Nairobi Water & Sewerage bills promptly to ensure uninterrupted service.',
    href: '/services/water',
    defaultStatus: 'enabled',
  },

  // --- TV Subscriptions ---
  {
    id: 'dstv',
    title: 'DStv Subscription',
    shortName: 'DStv',
    category: 'tv',
    categoryLabel: 'TV & Media',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/dstv-logo.jpg',
    badge: 'Instant Clear',
    tagline: 'Premium Channels',
    description: 'Renew your DStv decoder packages with automated smartcard detection and instant signal reactivation.',
    href: '/services/tv?provider=dstv',
    defaultStatus: 'enabled',
  },
  {
    id: 'gotv',
    title: 'GOtv Subscription',
    shortName: 'GOtv',
    category: 'tv',
    categoryLabel: 'TV & Media',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/gotv-logo.png',
    badge: 'Instant Clear',
    tagline: 'Digital Decoder Pay',
    description: 'Renew your GOtv subscription effortlessly and get back to your favorite matches and entertainment.',
    href: '/services/tv?provider=gotv',
    defaultStatus: 'enabled',
  },
  {
    id: 'startimes',
    title: 'StarTimes Decoder',
    shortName: 'StarTimes',
    category: 'tv',
    categoryLabel: 'TV & Media',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/startimes-logo.jpg',
    badge: 'Instant',
    tagline: 'Smartcard Recharge',
    description: 'Keep your StarTimes decoder active. Instant smartcard verification and payments available 24/7.',
    href: '/services/tv?provider=startimes',
    defaultStatus: 'enabled',
  },
  {
    id: 'zuku',
    title: 'Zuku Satellite TV',
    shortName: 'Zuku TV',
    category: 'tv',
    categoryLabel: 'TV & Media',
    groupKey: 'bill_payments',
    groupTitle: 'Utility & Bill Payments',
    logoSrc: '/logos/zuku-logo.jpg',
    badge: 'Direct',
    tagline: 'Fiber & Decoder',
    description: 'Settle your Zuku TV or satellite decoder bills fast and securely with automated reconciliation.',
    href: '/services/tv?provider=zuku',
    defaultStatus: 'enabled',
  },
];

/**
 * Resolves the effective status for a service by checking:
 * 1. Specific env var: NEXT_PUBLIC_SERVICE_STATUS_<ID_SANITIZED> (e.g. NEXT_PUBLIC_SERVICE_STATUS_FAIBA_DATA=coming_soon)
 * 2. Legacy Faiba bundle feature flag migration (NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES)
 * 3. Category-level env var: NEXT_PUBLIC_CATEGORY_STATUS_<CATEGORY>
 * 4. Default status defined in MASTER_SERVICES
 */
export function getServiceStatus(serviceId: string): ServiceStatus {
  const s = MASTER_SERVICES.find((item) => item.id === serviceId);
  if (!s) return 'hidden';

  // 1. Check exact service ID env override
  const envKey = `NEXT_PUBLIC_SERVICE_STATUS_${serviceId.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  const envVal = process.env[envKey]?.toLowerCase()?.trim();
  if (envVal === 'enabled' || envVal === 'coming_soon' || envVal === 'hidden') {
    return envVal as ServiceStatus;
  }

  // 2. Backward-compatible migration for legacy Faiba Bundles flag
  if (serviceId === 'faiba-data') {
    const legacyFaibaFlag = process.env.NEXT_PUBLIC_ENABLE_FAIBA_BUNDLES?.toLowerCase()?.trim();
    if (legacyFaibaFlag === 'true') {
      return 'enabled';
    }
    if (legacyFaibaFlag === 'false') {
      return 'coming_soon';
    }
  }

  // 3. Category-level override
  const catKey = `NEXT_PUBLIC_CATEGORY_STATUS_${s.category.toUpperCase()}`;
  const catVal = process.env[catKey]?.toLowerCase()?.trim();
  if (catVal === 'enabled' || catVal === 'coming_soon' || catVal === 'hidden') {
    return catVal as ServiceStatus;
  }

  return s.defaultStatus;
}

/**
 * Returns all registered services with their evaluated status.
 */
export function getAllServices(): (ServiceDefinition & { status: ServiceStatus })[] {
  return MASTER_SERVICES.map((service) => ({
    ...service,
    status: getServiceStatus(service.id),
  }));
}

/**
 * Returns only visible services ('enabled' or 'coming_soon').
 * Suppresses any service with status === 'hidden'.
 */
export function getVisibleServices(): (ServiceDefinition & { status: ServiceStatus })[] {
  return getAllServices().filter((s) => s.status !== 'hidden');
}

/**
 * Returns only services that are fully enabled for live transactions.
 */
export function getEnabledServices(): (ServiceDefinition & { status: ServiceStatus })[] {
  return getAllServices().filter((s) => s.status === 'enabled');
}

/**
 * Checks whether a specific service is enabled.
 */
export function isServiceEnabled(serviceId: string): boolean {
  return getServiceStatus(serviceId) === 'enabled';
}

/**
 * Returns a specific service definition by ID.
 */
export function getServiceById(serviceId: string): (ServiceDefinition & { status: ServiceStatus }) | undefined {
  const service = MASTER_SERVICES.find((s) => s.id === serviceId);
  if (!service) return undefined;
  return {
    ...service,
    status: getServiceStatus(service.id),
  };
}

/**
 * Groups visible services into logical operational clusters:
 * - "Mobile Airtime & Internet Data"
 * - "Utility & Bill Payments"
 */
export function getGroupedServices(): ServiceGroup[] {
  const visible = getVisibleServices();

  const groups: ServiceGroup[] = [
    {
      key: 'airtime_data',
      title: 'Airtime & Data Bundles',
      tagline: 'Instant top-up across Safaricom, Airtel, Telkom, Equitel & Faiba networks',
      iconName: 'Smartphone',
      services: visible.filter((s) => s.groupKey === 'airtime_data'),
    },
    {
      key: 'bill_payments',
      title: 'Utility & Entertainment Bills',
      tagline: 'Prepaid & postpaid KPLC tokens, Nairobi Water, and direct TV subscription recharge',
      iconName: 'Zap',
      services: visible.filter((s) => s.groupKey === 'bill_payments'),
    },
  ];

  return groups.filter((g) => g.services.length > 0);
}

/**
 * Returns the top-level categories for navbar, hero launchers, and category filters.
 * Reflects whether any service in that category is visible/enabled.
 */
export function getServiceCategories(): ServiceCategoryNav[] {
  const visible = getVisibleServices();

  const CATEGORY_MAP: Record<ServiceCategory, { name: string; desc: string; href: string; iconName: ServiceCategoryNav['iconName']; badge: string }> = {
    airtime: {
      name: 'Airtime Top-Up',
      desc: 'Safaricom, Airtel, Telkom & Equitel',
      href: '/services/airtime',
      iconName: 'Smartphone',
      badge: '0% Fee',
    },
    data: {
      name: 'Data Bundles',
      desc: 'Daily, weekly & monthly high-speed',
      href: '/services/data',
      iconName: 'Wifi',
      badge: 'Best Value',
    },
    electricity: {
      name: 'Electricity Tokens',
      desc: 'KPLC Prepaid & Postpaid meters',
      href: '/services/electricity',
      iconName: 'Zap',
      badge: '24/7 Vend',
    },
    tv: {
      name: 'TV Subscriptions',
      desc: 'DStv, GOtv, Zuku & StarTimes',
      href: '/services/tv',
      iconName: 'Tv',
      badge: 'Instant Clear',
    },
    water: {
      name: 'Water Utility',
      desc: 'Nairobi Water & municipal meters',
      href: '/services/water',
      iconName: 'Droplets',
      badge: 'Zero Fee',
    },
  };

  const categories: ServiceCategoryNav[] = (Object.keys(CATEGORY_MAP) as ServiceCategory[]).map((cat) => {
    const matchingServices = visible.filter((s) => s.category === cat);
    let catStatus: ServiceStatus = 'hidden';
    if (matchingServices.some((s) => s.status === 'enabled')) {
      catStatus = 'enabled';
    } else if (matchingServices.some((s) => s.status === 'coming_soon')) {
      catStatus = 'coming_soon';
    }

    return {
      id: cat,
      ...CATEGORY_MAP[cat],
      status: catStatus,
    };
  });

  return categories.filter((c) => c.status !== 'hidden');
}
