import { QasiNetError, ErrorCategory } from '../../errors';

export function mapKyandaError(code: string | number, message?: string, details?: any): QasiNetError {
  const codeStr = String(code);
  let category: ErrorCategory = 'UNKNOWN';
  let defaultMessage = 'An unknown error occurred';

  switch (codeStr) {
    case '0000':
    case '1100':
      // Success or Pending processing - these shouldn't be mapped as errors, but here for completeness
      category = 'UNKNOWN';
      defaultMessage = 'Success / Pending';
      break;
    case '1101':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Invalid Merchant ID.';
      break;
    case '1102':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Authentication failed.';
      break;
    case '1103':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Forbidden access';
      break;
    case '1104':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Signature Mismatch.';
      break;
    case '1105':
      category = 'SERVICE_UNAVAILABLE';
      defaultMessage = 'Payment services unavailable.';
      break;
    case '1106':
      category = 'SERVICE_UNAVAILABLE';
      defaultMessage = 'Airtime Service unavailable.';
      break;
    case '1107':
      category = 'INSUFFICIENT_FLOAT';
      defaultMessage = 'Insufficient float balance.';
      break;
    case '1108':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Missing parameter.';
      break;
    case '1109':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Parameter validation error.';
      break;
    case '1201':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid Bank Code';
      break;
    case '5000':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Unexpected error has occurred.';
      break;
    case '6001':
      category = 'PROVIDER_ERROR';
      defaultMessage = 'Cannot register the URL';
      break;
    case '6002':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid URL format.';
      break;
    case '7001':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Transaction not found.';
      break;
    case '8001':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid account number format.';
      break;
    case '8002':
    case '9001':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid phone number format.';
      break;
    case '8003':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid Telco.';
      break;
    case '8004':
    case '9003':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid amount format.';
      break;
    case '8005':
    case '9004':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Amount limit exceeded.';
      break;
    case '8006':
    case '9005':
      category = 'DUPLICATE_REQUEST';
      defaultMessage = 'Duplicate transmission.';
      break;
    case '9002':
      category = 'VALIDATION_ERROR';
      defaultMessage = 'Invalid transaction channel.';
      break;
    default:
      category = 'UNKNOWN';
      defaultMessage = message || 'Unknown Kyanda error occurred.';
      break;
  }

  return new QasiNetError(category, message || defaultMessage, details);
}
