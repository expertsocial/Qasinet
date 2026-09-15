import { describe, it, expect } from 'vitest';
import { parseC2BReference } from '../src/app/api/webhooks/mpesa/c2b/route';

describe('Safaricom C2B Reference Parser & Order Matcher', () => {
  it('parses structured CODE*PHONE reference correctly', () => {
    const result = parseC2BReference('1.25GB*0712345678', '254799000000', 51);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('1.25GB');
    expect(result.recipient).toBe('0712345678');
    expect(result.serviceSlug).toBe('safaricom-data');
  });

  it('normalizes 254-prefixed phone numbers in structured reference with hash separator', () => {
    const result = parseC2BReference('2GB#254712345678', '254799000000', 41);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('2GB');
    expect(result.recipient).toBe('0712345678');
    expect(result.serviceSlug).toBe('safaricom-data');
  });

  it('supports dash separator in structured reference', () => {
    const result = parseC2BReference('14GB-0722112233', '254799000000', 199);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('14GB');
    expect(result.recipient).toBe('0722112233');
    expect(result.serviceSlug).toBe('safaricom-data');
  });

  it('parses bundle code only and assigns recipient to payer phone', () => {
    const result = parseC2BReference('1.25GB', '254712345678', 51);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('1.25GB');
    expect(result.recipient).toBe('0712345678');
    expect(result.serviceSlug).toBe('safaricom-data');
  });

  it('correctly identifies Airtel data bundles from catalog', () => {
    const result = parseC2BReference('AIR_2GB*0112345678', '254112345678', 41);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('AIR_2GB');
    expect(result.recipient).toBe('0112345678');
    expect(result.serviceSlug).toBe('airtel-data');
  });

  it('deduces bundle from unique amount when customer enters only their phone number', () => {
    // 51 KES is uniquely Safaricom 1.25GB
    const result = parseC2BReference('0712345678', '254712345678', 51);

    expect(result.isAmbiguous).toBe(false);
    expect(result.bundleCode).toBe('1.25GB');
    expect(result.recipient).toBe('0712345678');
    expect(result.serviceSlug).toBe('safaricom-data');
  });

  it('flags ambiguous, unparseable, or unrecognized text as ambiguous', () => {
    const result1 = parseC2BReference('bundles please', '254712345678', 51);
    expect(result1.isAmbiguous).toBe(true);
    expect(result1.bundleCode).toBeNull();

    const result2 = parseC2BReference('RANDOM_TEXT_123', '254712345678', 100);
    expect(result2.isAmbiguous).toBe(true);
    expect(result2.bundleCode).toBeNull();
  });
});
