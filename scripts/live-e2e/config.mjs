/**
 * scripts/live-e2e/config.mjs
 * 
 * Central configuration for the QasiNet Live E2E Verification Harness.
 * Defines active service endpoints, minimum viable test amounts, known-good test
 * accounts, and hard safety ceilings.
 */

export const SAFETY_CONFIG = {
  // Hard ceiling: script will refuse to plan/run any test suite exceeding this amount
  DEFAULT_MAX_SPEND_CAP: 500, // KES

  // Float buffer required above total planned spend to prevent running dry
  MIN_FLOAT_BUFFER: 50, // KES

  // Maximum time to wait for the human to approve STK prompt on their phone
  STK_APPROVAL_TIMEOUT_MS: 75000, // 75 seconds

  // Maximum time to wait for Kyanda vending and terminal status resolution
  VENDING_TIMEOUT_MS: 180000, // 3 minutes (180s)

  // Status check poll interval
  POLL_INTERVAL_MS: 3500, // 3.5 seconds

  // Default wait window for M-Pesa STK prompts to expire on the network in trigger-only mode
  DEFAULT_EXPIRY_WAIT_SECS: 90, // 90 seconds
};

/**
 * Service test configurations.
 * Minimum viable amounts adhere strictly to documented provider minimums.
 */
export const SERVICE_TEST_DEFINITIONS = [
  // --------------------------------------------------------------------------
  // Mobile Airtime (One per active network)
  // --------------------------------------------------------------------------
  {
    serviceSlug: 'safaricom-airtime',
    name: 'Safaricom Airtime',
    category: 'airtime',
    amount: 10,
    // Defaults to the paying M-Pesa phone so the operator receives the airtime
    destinationType: 'paying_phone',
    defaultDestination: null,
    hasKnownGoodTestAccount: true,
    notes: 'Vends airtime directly to the test phone receiving the STK push.',
  },
  {
    serviceSlug: 'airtel-airtime',
    name: 'Airtel Airtime',
    category: 'airtime',
    amount: 10,
    destinationType: 'custom_phone',
    defaultDestination: '0733000000',
    hasKnownGoodTestAccount: false,
    notes: 'Requires an active Airtel SIM destination. Override via --dest-airtel=07XXXXXXXX.',
  },
  {
    serviceSlug: 'telkom-airtime',
    name: 'Telkom Airtime',
    category: 'airtime',
    amount: 10,
    destinationType: 'custom_phone',
    defaultDestination: '0770000000',
    hasKnownGoodTestAccount: false,
    notes: 'Requires an active Telkom SIM destination. Override via --dest-telkom=07XXXXXXXX.',
  },
  {
    serviceSlug: 'equitel-airtime',
    name: 'Equitel Airtime',
    category: 'airtime',
    amount: 10,
    destinationType: 'custom_phone',
    defaultDestination: '0763000000',
    hasKnownGoodTestAccount: false,
    notes: 'Requires an active Equitel SIM destination. Override via --dest-equitel=07XXXXXXXX.',
  },
  {
    serviceSlug: 'faiba-airtime',
    name: 'Faiba 4G Airtime',
    category: 'airtime',
    amount: 10,
    destinationType: 'custom_phone',
    defaultDestination: '0747000000',
    hasKnownGoodTestAccount: false,
    notes: 'Requires an active Faiba SIM destination. Override via --dest-faiba=0747XXXXXX.',
  },

  // --------------------------------------------------------------------------
  // Mobile Data Bundles (Faiba 4G)
  // --------------------------------------------------------------------------
  {
    serviceSlug: 'faiba-data',
    name: 'Faiba 4G Data Package',
    category: 'data',
    // Smallest documented Faiba bundle: 100MB 24 Hours (KES 10) or DAILY_500MB (KES 20)
    amount: 10,
    productId: 'DAILY_500MB', // or DB uuid '3325b548-facf-4103-96cd-f5627668599f'
    destinationType: 'custom_phone',
    defaultDestination: '0747000000',
    hasKnownGoodTestAccount: false,
    notes: 'Requires active Faiba 0747 line. Override via --dest-faiba=0747XXXXXX.',
  },

  // --------------------------------------------------------------------------
  // TV Subscriptions (One per provider: GOtv, DStv, Zuku, StarTimes)
  // --------------------------------------------------------------------------
  {
    serviceSlug: 'gotv',
    name: 'GOtv Subscription',
    category: 'tv',
    amount: 50, // Minimum whole-number bill payment on QasiNet
    destinationType: 'account_number',
    defaultDestination: '2019283746', // Confirmed test IUC decoder from tv_payment_test_report.md
    hasKnownGoodTestAccount: true,
    notes: 'Decoder IUC: 2019283746 (previously verified live against Kyanda Pay Bill).',
  },
  {
    serviceSlug: 'dstv',
    name: 'DStv Subscription',
    category: 'tv',
    amount: 50,
    destinationType: 'account_number',
    defaultDestination: '1029384756', // Confirmed test smartcard from tv_payment_test_report.md
    hasKnownGoodTestAccount: true,
    notes: 'Smartcard: 1029384756 (previously verified live against Kyanda Pay Bill).',
  },
  {
    serviceSlug: 'zuku',
    name: 'Zuku Satellite TV',
    category: 'tv',
    amount: 50,
    destinationType: 'account_number',
    defaultDestination: '3049586721', // Confirmed test account from tv_payment_test_report.md
    hasKnownGoodTestAccount: true,
    notes: 'Account: 3049586721 (previously verified live against Kyanda Pay Bill).',
  },
  {
    serviceSlug: 'startimes',
    name: 'StarTimes Decoder',
    category: 'tv',
    amount: 50,
    destinationType: 'account_number',
    defaultDestination: '0192837465', // Confirmed test smartcard from tv_payment_test_report.md
    hasKnownGoodTestAccount: true,
    notes: 'Smartcard: 0192837465 (previously verified live against Kyanda Pay Bill).',
  },

  // --------------------------------------------------------------------------
  // Water Utilities
  // --------------------------------------------------------------------------
  {
    serviceSlug: 'nairobi-water',
    name: 'Nairobi Water Utility',
    category: 'water',
    amount: 50, // Minimum whole-number bill payment on QasiNet
    destinationType: 'account_number',
    defaultDestination: '1234567', // Confirmed test account from water_payments_test_report.md
    hasKnownGoodTestAccount: true,
    notes: 'Account: 1234567 (previously verified live against Kyanda Pay Bill).',
  },

  // --------------------------------------------------------------------------
  // Electricity (Paused Services - Included to verify registry pause detection)
  // --------------------------------------------------------------------------
  {
    serviceSlug: 'kplc-prepaid',
    name: 'KPLC Prepaid Electricity Tokens',
    category: 'electricity',
    amount: 50,
    destinationType: 'account_number',
    defaultDestination: '14123456789',
    hasKnownGoodTestAccount: false,
    notes: 'PAUSED IN REGISTRY. Must be automatically skipped by harness.',
  },
  {
    serviceSlug: 'kplc-postpaid',
    name: 'KPLC Postpaid Bill',
    category: 'electricity',
    amount: 50,
    destinationType: 'account_number',
    defaultDestination: '1234567',
    hasKnownGoodTestAccount: false,
    notes: 'PAUSED IN REGISTRY. Must be automatically skipped by harness.',
  },
];
