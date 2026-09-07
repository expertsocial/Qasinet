/**
 * Kyanda Pay Bill & Electricity Configuration
 *
 * Handles runtime resolution for:
 * 1. Pay Bill account field name ('account' vs 'phone') per Kyanda API docs inconsistency.
 * 2. KPLC channel codes (Prepaid & Postpaid) configured via environment variables.
 */

/**
 * Returns the field name to use for the meter/account number in Pay Bill API requests.
 * Reads from KYANDA_PAYBILL_ACCOUNT_FIELD env var. Defaults to 'account' per Section B of Kyanda docs.
 * Can be switched to 'phone' via environment variable without redeploying code.
 */
export function getPaybillAccountField(): 'account' | 'phone' {
  const envVal = process.env.KYANDA_PAYBILL_ACCOUNT_FIELD?.toLowerCase().trim();
  if (envVal === 'phone') {
    return 'phone';
  }
  return 'account';
}

/**
 * TODO: Confirm official Kenya Power telco/channel codes with Kyanda Support.
 * Different aggregator environments may use 'KPLC', 'KPLC_PREPAID', 'KPLC_POSTPAID', 'KENYA_POWER', etc.
 * Do NOT guess in production. Set KYANDA_KPLC_PREPAID_CHANNEL and KYANDA_KPLC_POSTPAID_CHANNEL.
 */
export function getKplcChannelCode(type: 'prepaid' | 'postpaid' = 'prepaid'): string {
  const envVar = type === 'postpaid' 
    ? process.env.KYANDA_KPLC_POSTPAID_CHANNEL 
    : process.env.KYANDA_KPLC_PREPAID_CHANNEL;

  const channelCode = envVar?.trim();

  if (!channelCode) {
    console.warn(
      `[PayBill KPLC] WARNING: Kenya Power channel code for ${type} is NOT SET! ` +
      `Please confirm the channel code with Kyanda support and set ` +
      `${type === 'postpaid' ? 'KYANDA_KPLC_POSTPAID_CHANNEL' : 'KYANDA_KPLC_PREPAID_CHANNEL'} in environment variables.`
    );
    return '';
  }

  return channelCode;
}
