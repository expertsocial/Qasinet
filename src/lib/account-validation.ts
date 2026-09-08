export interface AccountValidationResult {
  isValid: boolean;
  error: string | null;
  normalized: string;
}

/**
 * Service-aware account number validator for electricity meters, TV decoders, and water accounts.
 */
export function validateServiceAccount(account: string, serviceType: string = ''): AccountValidationResult {
  const clean = (account || '').trim();
  if (!clean) {
    return { isValid: false, error: 'Account number is required.', normalized: '' };
  }

  const s = serviceType.toLowerCase().trim();

  // 1. KPLC Prepaid Meter (10 to 12 numeric digits, e.g. 14123456789)
  if (s === 'kplc-prepaid' || (s.includes('kplc') && s.includes('prepaid'))) {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly) {
      return {
        isValid: false,
        error: 'KPLC meter numbers must contain digits only.',
        normalized: digitsOnly
      };
    }
    if (digitsOnly.length < 10 || digitsOnly.length > 12) {
      return {
        isValid: false,
        error: 'KPLC meter numbers must be 10 to 12 digits (e.g. 14123456789).',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 2. KPLC Postpaid Account (6 to 10 numeric digits, e.g. 1234567)
  if (s === 'kplc-postpaid' || (s.includes('kplc') && s.includes('postpaid'))) {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly) {
      return {
        isValid: false,
        error: 'KPLC postpaid account numbers must contain digits only.',
        normalized: digitsOnly
      };
    }
    if (digitsOnly.length < 6 || digitsOnly.length > 10) {
      return {
        isValid: false,
        error: 'KPLC postpaid account numbers must be 6 to 10 digits.',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 3. GOtv (10 numeric digits, e.g. 2019283746)
  if (s === 'gotv') {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly || digitsOnly.length !== 10) {
      return {
        isValid: false,
        error: 'GOtv IUC numbers must be exactly 10 digits (e.g. 2019283746).',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 4. DStv (10 or 11 numeric digits, e.g. 1029384756)
  if (s === 'dstv') {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly || digitsOnly.length < 10 || digitsOnly.length > 11) {
      return {
        isValid: false,
        error: 'DStv smartcard numbers must be 10 or 11 digits (e.g. 1029384756).',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 5. Zuku (6 to 10 numeric digits, e.g. 3049586721)
  if (s === 'zuku') {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly || digitsOnly.length < 6 || digitsOnly.length > 10) {
      return {
        isValid: false,
        error: 'Zuku account numbers must be 6 to 10 digits (e.g. 3049586721).',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 6. StarTimes (10 to 12 numeric digits, e.g. 0192837465)
  if (s === 'startimes') {
    const digitsOnly = clean.replace(/\D/g, '');
    if (clean !== digitsOnly || digitsOnly.length < 10 || digitsOnly.length > 12) {
      return {
        isValid: false,
        error: 'StarTimes smartcard numbers must be 10 to 12 digits (e.g. 0192837465).',
        normalized: digitsOnly
      };
    }
    return { isValid: true, error: null, normalized: digitsOnly };
  }

  // 7. Water (Nairobi Water: 5 to 15 alphanumeric characters, e.g. 1234567)
  if (s.includes('water') || s === 'nairobi-water') {
    const sanitized = clean.replace(/[^a-zA-Z0-9-]/g, '');
    if (sanitized.length < 5 || sanitized.length > 15) {
      return {
        isValid: false,
        error: 'Water account numbers must be between 5 and 15 characters (e.g. 1234567).',
        normalized: sanitized
      };
    }
    return { isValid: true, error: null, normalized: sanitized };
  }

  // Generic fallback for other utility billers: 4 to 20 characters
  if (clean.length < 4 || clean.length > 20) {
    return {
      isValid: false,
      error: 'Please enter a valid account or meter number (4 to 20 characters).',
      normalized: clean
    };
  }

  return { isValid: true, error: null, normalized: clean };
}

export function isUtilityService(serviceId: string = ''): boolean {
  const s = (serviceId || '').toLowerCase();
  return (
    s.includes('kplc') ||
    s.includes('electricity') ||
    s.includes('dstv') ||
    s.includes('gotv') ||
    s.includes('zuku') ||
    s.includes('startimes') ||
    s.includes('tv') ||
    s.includes('water')
  );
}

export function getServiceDestinationLabel(serviceId: string = ''): string {
  const s = (serviceId || '').toLowerCase();
  if (s.includes('prepaid')) return 'Meter Number';
  if (s.includes('kplc') || s.includes('postpaid')) return 'Account Number';
  if (s.includes('dstv') || s.includes('gotv') || s.includes('startimes') || s.includes('zuku') || s.includes('tv')) {
    return 'Decoder / Smartcard Number';
  }
  if (s.includes('water')) return 'Water Account Number';
  return 'Mobile Number';
}
