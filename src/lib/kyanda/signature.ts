import crypto from 'crypto';

/**
 * Generate HMAC SHA-256 signature for Kyanda API requests
 * 
 * Note: Kyanda uses different concatenation orders for different endpoints.
 * This is a base utility that should be called by endpoint-specific wrappers.
 * 
 * @param dataString The concatenated string of parameters (e.g., MerchantID + transactionRef)
 * @param securityKey The Kyanda Security Key
 * @returns The HMAC SHA-256 signature
 */
export function generateKyandaSignature(dataString: string, securityKey: string): string {
  if (!securityKey) {
    throw new Error('Kyanda security key is not configured');
  }
  
  return crypto
    .createHmac('sha256', securityKey)
    .update(dataString)
    .digest('hex');
}

/**
 * Example: Signature for Account Balance
 */
export function signAccountBalance(merchantId: string, securityKey: string): string {
  return generateKyandaSignature(merchantId, securityKey);
}

/**
 * Example: Signature for Transaction Status
 */
export function signTransactionStatus(merchantId: string, transactionRef: string, securityKey: string): string {
  return generateKyandaSignature(`${merchantId}${transactionRef}`, securityKey);
}
