import { isServiceEnabled } from '@/lib/services/registry';

export interface FaibaBundle {
  name: string;
  code: string;
  price: number;
  validity: string;
  allowance: string;
  autoRenewCode?: string;
}

/**
 * Service registry availability state for Faiba bundles.
 * Migrated from one-off env var into the unified service registry.
 */
export const IS_FAIBA_BUNDLES_ENABLED = isServiceEnabled('faiba-data');

export const FAIBA_BUNDLE_CODES = [
  // Standard Documented Product Codes (Case-sensitive per Kyanda documentation)
  'DAILY_500MB',
  'fisihour3',
  'Daily_1.5GB',
  'Gumzo_Weekly_50',
  'fisihour5',
  '3GB3DAY',
  'fisihour6',
  'WEEKLY_DATA_10GB',
  'Gumzo_Monthly_250',
  'Monthly_15GB',
  'Gumzo_Monthly_500',
  'All_inOne_5',
  'MONTHLY_DATA_40GB',
  'All_inOne_10',
  'Monthly_120GB',
  'All_inOne_20',
  'Family_Basic_Plus_150Mins',
  'Family_Plus_Plus_300Mins',
  'Family_Max_Plus_600Mins',
  // Auto-renew productCode variants
  'DAILY_AUTO_500MB',
  'WEEKLY_DATA_AUTO_10GB',
  'Monthly_15GB_Auto',
  'MONTHLY_DATA_AUTO_40GB',
  'Monthly_120GB_Auto',
] as const;

export type FaibaBundleCode = typeof FAIBA_BUNDLE_CODES[number];

export const FAIBA_DATA_BUNDLES: FaibaBundle[] = [
  { name: 'Daily 500MB', code: 'DAILY_500MB', price: 20, validity: '1 day', allowance: '500MB', autoRenewCode: 'DAILY_AUTO_500MB' },
  { name: 'Fisi 3 hour', code: 'fisihour3', price: 50, validity: '3 hours', allowance: 'Unlimited' },
  { name: 'Daily 1.5GB', code: 'Daily_1.5GB', price: 50, validity: '1 day', allowance: '1.5GB' },
  { name: 'Gumzo Weekly 50', code: 'Gumzo_Weekly_50', price: 75, validity: '7 days', allowance: '50 mins' },
  { name: 'Fisi 5 hour', code: 'fisihour5', price: 80, validity: '5 hours', allowance: 'Unlimited' },
  { name: '3GB 3 day', code: '3GB3DAY', price: 100, validity: '3 days', allowance: '3GB' },
  { name: 'Fisi 6 hour', code: 'fisihour6', price: 120, validity: '6 hours', allowance: 'Unlimited' },
  { name: 'Weekly 10GB', code: 'WEEKLY_DATA_10GB', price: 300, validity: '7 days', allowance: '10GB', autoRenewCode: 'WEEKLY_DATA_AUTO_10GB' },
  { name: 'Gumzo Monthly 250', code: 'Gumzo_Monthly_250', price: 300, validity: '30 days', allowance: '250 mins' },
  { name: 'Monthly 15GB', code: 'Monthly_15GB', price: 500, validity: '30 days', allowance: '15GB', autoRenewCode: 'Monthly_15GB_Auto' },
  { name: 'Gumzo Monthly 500', code: 'Gumzo_Monthly_500', price: 500, validity: '30 days', allowance: '500 mins' },
  { name: 'All in One 5', code: 'All_inOne_5', price: 500, validity: '30 days', allowance: '5GB + 200 mins' },
  { name: 'Monthly 40GB', code: 'MONTHLY_DATA_40GB', price: 1000, validity: '30 days', allowance: '40GB', autoRenewCode: 'MONTHLY_DATA_AUTO_40GB' },
  { name: 'All in One 10', code: 'All_inOne_10', price: 1000, validity: '30 days', allowance: '10GB + 400 mins' },
  { name: 'Monthly 120GB', code: 'Monthly_120GB', price: 2000, validity: '30 days', allowance: '120GB', autoRenewCode: 'Monthly_120GB_Auto' },
  { name: 'All in One 20', code: 'All_inOne_20', price: 2000, validity: '30 days', allowance: '20GB + 800 mins' },
  { name: 'Family Basic Plus 150 mins', code: 'Family_Basic_Plus_150Mins', price: 2000, validity: '30 days', allowance: '150 mins' },
  { name: 'Family Plus Plus 300 mins', code: 'Family_Plus_Plus_300Mins', price: 3500, validity: '30 days', allowance: '300 mins' },
  { name: 'Family Max Plus 600 mins', code: 'Family_Max_Plus_600Mins', price: 6000, validity: '30 days', allowance: '600 mins' },
];
