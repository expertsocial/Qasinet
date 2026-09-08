import { describe, it, expect } from 'vitest';
import { 
  validateServiceAccount, 
  isUtilityService, 
  getServiceDestinationLabel 
} from '@/lib/validation';

describe('Per-Service Account Number Validation', () => {
  describe('KPLC Electricity Validation', () => {
    it('accepts valid 10-12 digit KPLC prepaid meter numbers', () => {
      // 11-digit real test meter number
      const res1 = validateServiceAccount('14123456789', 'kplc-prepaid');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('14123456789');

      // 10-digit meter
      const res2 = validateServiceAccount('1234567890', 'kplc-prepaid');
      expect(res2.isValid).toBe(true);

      // 12-digit meter
      const res3 = validateServiceAccount('123456789012', 'kplc-prepaid');
      expect(res3.isValid).toBe(true);
    });

    it('rejects invalid KPLC prepaid meter numbers (too short, too long, non-numeric)', () => {
      // Too short
      const res1 = validateServiceAccount('12345', 'kplc-prepaid');
      expect(res1.isValid).toBe(false);
      expect(res1.error).toContain('10 to 12 digits');

      // Too long (13 digits)
      const res2 = validateServiceAccount('1234567890123', 'kplc-prepaid');
      expect(res2.isValid).toBe(false);

      // Non-numeric
      const res3 = validateServiceAccount('1412345678A', 'kplc-prepaid');
      expect(res3.isValid).toBe(false);
      expect(res3.error).toContain('digits only');
    });

    it('accepts valid 6-10 digit KPLC postpaid account numbers', () => {
      const res = validateServiceAccount('1234567', 'kplc-postpaid');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('1234567');
    });

    it('rejects invalid KPLC postpaid account numbers', () => {
      const res = validateServiceAccount('123', 'kplc-postpaid');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('6 to 10 digits');
    });
  });

  describe('TV Subscription Decoder Validation', () => {
    it('validates GOtv IUC numbers (exactly 10 digits)', () => {
      const valid = validateServiceAccount('2019283746', 'gotv');
      expect(valid.isValid).toBe(true);
      expect(valid.normalized).toBe('2019283746');

      const invalid = validateServiceAccount('201928374', 'gotv');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('exactly 10 digits');
    });

    it('validates DStv smartcard numbers (10 to 11 digits)', () => {
      const valid10 = validateServiceAccount('1029384756', 'dstv');
      expect(valid10.isValid).toBe(true);

      const valid11 = validateServiceAccount('10293847561', 'dstv');
      expect(valid11.isValid).toBe(true);

      const invalid = validateServiceAccount('1029384', 'dstv');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('10 or 11 digits');
    });

    it('validates Zuku account numbers (6 to 10 digits)', () => {
      const valid = validateServiceAccount('3049586721', 'zuku');
      expect(valid.isValid).toBe(true);

      const invalid = validateServiceAccount('1234', 'zuku');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('6 to 10 digits');
    });

    it('validates StarTimes smartcard numbers (10 to 12 digits)', () => {
      const valid = validateServiceAccount('0192837465', 'startimes');
      expect(valid.isValid).toBe(true);

      const invalid = validateServiceAccount('01928', 'startimes');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('10 to 12 digits');
    });
  });

  describe('Water Account Validation', () => {
    it('validates Nairobi Water account numbers (5 to 15 alphanumeric characters)', () => {
      const valid1 = validateServiceAccount('1234567', 'nairobi-water');
      expect(valid1.isValid).toBe(true);
      expect(valid1.normalized).toBe('1234567');

      const validAlphanumeric = validateServiceAccount('NW-987654', 'nairobi-water');
      expect(validAlphanumeric.isValid).toBe(true);

      const invalid = validateServiceAccount('123', 'nairobi-water');
      expect(invalid.isValid).toBe(false);
      expect(invalid.error).toContain('5 and 15 characters');
    });
  });

  describe('Utility vs Telco Helper Routing', () => {
    it('correctly identifies utility services vs telco mobile services', () => {
      expect(isUtilityService('kplc-prepaid')).toBe(true);
      expect(isUtilityService('kplc-postpaid')).toBe(true);
      expect(isUtilityService('dstv')).toBe(true);
      expect(isUtilityService('gotv')).toBe(true);
      expect(isUtilityService('zuku')).toBe(true);
      expect(isUtilityService('startimes')).toBe(true);
      expect(isUtilityService('nairobi-water')).toBe(true);

      // Telco services should return false
      expect(isUtilityService('airtime')).toBe(false);
      expect(isUtilityService('airtime-safaricom')).toBe(false);
      expect(isUtilityService('faiba-bundles')).toBe(false);
      expect(isUtilityService('data-airtel')).toBe(false);
    });

    it('returns appropriate destination labels for each service category', () => {
      expect(getServiceDestinationLabel('kplc-prepaid')).toBe('Meter Number');
      expect(getServiceDestinationLabel('kplc-postpaid')).toBe('Account Number');
      expect(getServiceDestinationLabel('dstv')).toBe('Decoder / Smartcard Number');
      expect(getServiceDestinationLabel('gotv')).toBe('Decoder / Smartcard Number');
      expect(getServiceDestinationLabel('nairobi-water')).toBe('Water Account Number');
      expect(getServiceDestinationLabel('airtime')).toBe('Mobile Number');
    });
  });
});
